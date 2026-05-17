import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import { OrderStatus } from '@prisma/client';
import { EsimProviderService } from './esim-provider.service';

/**
 * Payload, приходящий от eSIM Access на наш webhook endpoint.
 *
 * Типы событий:
 * - DATA_USAGE:      использовано 80% или 100% трафика
 * - VALIDITY_USAGE:  осталось ≤ 1 день до истечения
 * - ESIM_STATUS:     смена статуса eSIM (IN_USE, INSTALLATION, и т.д.)
 */
export interface EsimWebhookPayload {
  notifyType: 'DATA_USAGE' | 'VALIDITY_USAGE' | 'ESIM_STATUS' | 'ORDER_STATUS' | 'CHECK_HEALTH' | string;
  notifyId?: string;
  eventGenerateTime?: string;
  content: {
    orderNo?: string;
    transactionId?: string;
    iccid?: string;
    /** DATA_USAGE fields */
    totalVolume?: number;   // KB
    orderUsage?: number;    // KB
    remain?: number;        // KB
    /** VALIDITY_USAGE fields */
    durationUnit?: string;
    totalDuration?: number;
    expiredTime?: string;
    /** ESIM_STATUS fields */
    esimStatus?: string;
    smdpStatus?: string;
    /** ORDER_STATUS fields */
    orderStatus?: string;
  };
}

@Injectable()
export class EsimWebhookService {
  private readonly logger = new Logger(EsimWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private telegramNotification: TelegramNotificationService,
    private esimProviderService: EsimProviderService,
  ) {}

  /**
   * Обработка webhook от eSIM Access.
   * Вызывается контроллером на POST /esim-provider/webhook.
   */
  async handleWebhook(payload: EsimWebhookPayload): Promise<void> {
    const { notifyType, content } = payload;

    // CHECK_HEALTH — провайдер валидирует URL при сохранении
    if (notifyType === 'CHECK_HEALTH') {
      this.logger.log('📨 Webhook CHECK_HEALTH — валидационный ping от провайдера');
      return;
    }

    // Уведомляем админа о каждом входящем вебхуке (fire-and-forget)
    this.telegramNotification.notifyAdmin(`📨 Webhook: ${notifyType}`, {
      iccid: content?.iccid,
      orderNo: content?.orderNo,
      ...this.extractWebhookDetails(notifyType, content),
      notifyId: payload.notifyId,
      time: payload.eventGenerateTime,
    }).catch(() => {});

    switch (notifyType) {
      case 'ORDER_STATUS':
        await this.handleOrderStatus(content);
        break;
      case 'DATA_USAGE':
        if (!content?.iccid) {
          this.logger.warn('DATA_USAGE webhook без ICCID, пропускаем');
          return;
        }
        this.logger.log(
          `📨 Webhook: type=${notifyType}, iccid=${content.iccid}` +
            (payload.notifyId ? `, notifyId=${payload.notifyId}` : ''),
        );
        await this.handleDataUsage(content);
        break;
      case 'VALIDITY_USAGE':
        if (!content?.iccid) {
          this.logger.warn('VALIDITY_USAGE webhook без ICCID, пропускаем');
          return;
        }
        this.logger.log(
          `📨 Webhook: type=${notifyType}, iccid=${content.iccid}` +
            (payload.notifyId ? `, notifyId=${payload.notifyId}` : ''),
        );
        await this.handleValidityUsage(content);
        break;
      case 'ESIM_STATUS':
        if (!content?.iccid) {
          this.logger.warn('ESIM_STATUS webhook без ICCID, пропускаем');
          return;
        }
        this.logger.log(
          `📨 Webhook: type=${notifyType}, iccid=${content.iccid}` +
            (payload.notifyId ? `, notifyId=${payload.notifyId}` : ''),
        );
        await this.handleEsimStatus(content);
        break;
      default:
        this.logger.warn(`Неизвестный тип webhook: ${notifyType}`);
    }
  }

  /**
   * ORDER_STATUS: заказ у провайдера дошёл до этапа, где ресурс готов.
   *
   * Практический смысл для нас:
   * - если в synchronous purchase path esimList был пуст или частичный,
   *   webhook даёт второй шанс дообогатить локальный order по `orderNo`;
   * - `GOT_RESOURCE` — сигнал сходить в provider query и попытаться получить
   *   ICCID / QR / activation code / SMDP.
   */
  private async handleOrderStatus(content: EsimWebhookPayload['content']) {
    this.logger.log(`📨 ORDER_STATUS: orderNo=${content.orderNo}, status=${content.orderStatus}`);

    if (!content.orderNo) {
      this.logger.warn('ORDER_STATUS webhook без orderNo, пропускаем');
      return;
    }

    if (content.orderStatus !== 'GOT_RESOURCE') {
      return;
    }

    const localOrder = await this.prisma.order.findFirst({
      where: {
        providerOrderId: content.orderNo,
      },
      select: {
        id: true,
        iccid: true,
        qrCode: true,
        activationCode: true,
        smdpAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!localOrder) {
      this.logger.warn(`ORDER_STATUS: локальный заказ с providerOrderId=${content.orderNo} не найден`);
      return;
    }

    if (
      localOrder.iccid &&
      localOrder.qrCode &&
      localOrder.activationCode &&
      localOrder.smdpAddress
    ) {
      this.logger.log(`ORDER_STATUS: локальный заказ ${localOrder.id} уже обогащён, query не нужен`);
      return;
    }

    try {
      const providerOrder = await this.esimProviderService.queryOrder(content.orderNo);
      const profile = this.extractProfileFromProviderOrder(providerOrder);

      if (!profile) {
        this.logger.warn(
          `ORDER_STATUS: provider query по ${content.orderNo} не вернул профиль для локального заказа ${localOrder.id}`,
        );
        return;
      }

      await this.prisma.order.update({
        where: { id: localOrder.id },
        data: {
          ...(profile.iccid ? { iccid: profile.iccid } : {}),
          ...(profile.qrCode ? { qrCode: profile.qrCode } : {}),
          ...(profile.activationCode ? { activationCode: profile.activationCode } : {}),
          ...(profile.smdpAddress ? { smdpAddress: profile.smdpAddress } : {}),
          providerResponse: providerOrder as any,
        },
      });

      this.logger.log(
        `ORDER_STATUS: локальный заказ ${localOrder.id} дообогащён по provider order ${content.orderNo}`,
      );
    } catch (error: any) {
      this.logger.warn(
        `ORDER_STATUS: provider query по ${content.orderNo} завершился ошибкой: ${error.message}`,
      );
    }
  }

  /**
   * DATA_USAGE: использовано 80% или 100% трафика.
   * Обновляем кэш usage и отправляем TG-уведомление.
   */
  private async handleDataUsage(content: EsimWebhookPayload['content']) {
    const order = await this.findOrderByIccid(content.iccid);
    if (!order) return;

    // Обновляем кэш usage в БД (значения от провайдера — в КБ, в БД храним байты)
    if (content.totalVolume != null && content.remain != null) {
      const totalBytes = BigInt(content.totalVolume * 1024);
      const remainingBytes = BigInt(content.remain * 1024);
      const usedBytes = totalBytes - remainingBytes;

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          lastUsageBytes: usedBytes > 0n ? usedBytes : 0n,
          lastUsageTotalBytes: totalBytes,
          lastUsageAt: new Date(),
        },
      });
    }

    // Отправляем уведомление
    if (!order.user?.telegramId) return;

    const totalMB = (content.totalVolume ?? 0) / 1024;
    const remainMB = (content.remain ?? 0) / 1024;
    const usedPercent = totalMB > 0 ? ((totalMB - remainMB) / totalMB) * 100 : 0;
    const isExhausted = remainMB <= 0;

    // Если уже уведомляли о низком трафике — повторно шлём ТОЛЬКО если трафик полностью исчерпан
    if (order.lowTrafficNotifiedAt && !isExhausted) {
      return;
    }

    const totalDisplay = this.formatVolume(totalMB);
    const remainDisplay = this.formatVolume(remainMB);
    const country = order.product.country || order.product.name || 'eSIM';

    // Разные тексты в зависимости от степени использования
    let text: string;
    if (remainMB <= 0) {
      text =
        `🚫 <b>Трафик исчерпан</b>\n\n` +
        `🌍 ${country}\n` +
        `📊 Использовано: <b>${totalDisplay}</b> из ${totalDisplay}\n\n` +
        `Пополните трафик в приложении, чтобы продолжить пользоваться интернетом.`;
    } else if (usedPercent >= 80) {
      text =
        `📊 <b>Использовано ${Math.round(usedPercent)}% трафика</b>\n\n` +
        `🌍 ${country}\n` +
        `📉 Осталось: <b>${remainDisplay}</b> из ${totalDisplay}\n\n` +
        `Можно пополнить заранее в приложении.`;
    } else {
      // На всякий случай — если webhook пришёл на ином пороге
      text =
        `📊 <b>Статус трафика</b>\n\n` +
        `🌍 ${country}\n` +
        `📉 Осталось: <b>${remainDisplay}</b> из ${totalDisplay}\n\n` +
        `Можно пополнить в приложении.`;
    }

    try {
      await this.telegramNotification.sendTextNotification(
        order.user.telegramId.toString(),
        text,
        { openMyEsim: true },
      );
      await this.prisma.order.update({
        where: { id: order.id },
        data: { lowTrafficNotifiedAt: new Date() },
      });
      this.logger.log(`📨 DATA_USAGE уведомление отправлено для заказа ${order.id}`);
    } catch (error: any) {
      this.logger.warn(`Ошибка отправки DATA_USAGE уведомления: ${error.message}`);
    }
  }

  /**
   * VALIDITY_USAGE: до истечения eSIM осталось ≤ 1 день.
   */
  private async handleValidityUsage(content: EsimWebhookPayload['content']) {
    const order = await this.findOrderByIccid(content.iccid);
    if (!order) return;

    // Не уведомляем повторно
    if (order.expiryNotifiedAt) return;
    if (!order.user?.telegramId) return;

    const expiredTime = content.expiredTime
      ? new Date(content.expiredTime)
      : order.expiresAt;

    const hoursLeft = expiredTime
      ? Math.max(0, Math.floor((expiredTime.getTime() - Date.now()) / 3600000))
      : null;

    const country = order.product.country || order.product.name || 'eSIM';

    const text =
      `⏰ <b>eSIM скоро истекает</b>\n\n` +
      `🌍 ${country}\n` +
      (hoursLeft !== null ? `⏳ Осталось: <b>${hoursLeft} ч.</b>\n\n` : '\n') +
      `Можно продлить прямо в приложении.`;

    try {
      await this.telegramNotification.sendTextNotification(
        order.user.telegramId.toString(),
        text,
        { openMyEsim: true },
      );
      await this.prisma.order.update({
        where: { id: order.id },
        data: { expiryNotifiedAt: new Date() },
      });
      this.logger.log(`📨 VALIDITY_USAGE уведомление отправлено для заказа ${order.id}`);
    } catch (error: any) {
      this.logger.warn(`Ошибка отправки VALIDITY_USAGE уведомления: ${error.message}`);
    }
  }

  /**
   * ESIM_STATUS: обновление статуса eSIM.
   */
  private async handleEsimStatus(content: EsimWebhookPayload['content']) {
    const order = await this.findOrderByIccid(content.iccid);
    if (!order) return;

    const newStatus = content.esimStatus || content.smdpStatus;
    if (!newStatus) return;

    await this.prisma.order.update({
      where: { id: order.id },
      data: { esimStatus: newStatus },
    });

    this.logger.log(
      `📨 ESIM_STATUS обновлён: заказ ${order.id}, status=${newStatus}`,
    );
  }

  private extractProfileFromProviderOrder(providerOrder: any): {
    iccid: string | null;
    qrCode: string | null;
    activationCode: string | null;
    smdpAddress: string | null;
  } | null {
    const esim =
      providerOrder?.esimList?.[0] ||
      providerOrder?.profileList?.[0] ||
      providerOrder?.esim ||
      providerOrder;

    const iccid = this.pickString(esim?.iccid);
    const qrCode = this.pickString(esim?.qrCodeUrl, esim?.qrCode);
    const activationCode = this.pickString(
      esim?.lpa,
      esim?.ac,
      esim?.lpaCode,
      esim?.activationCode,
      esim?.matchingCode,
      esim?.matchingId,
      esim?.confirmationCode,
    );
    const smdpAddress = this.pickString(esim?.smdpAddress, esim?.smdp, esim?.smDpAddress);

    if (!iccid && !qrCode && !activationCode && !smdpAddress) {
      return null;
    }

    return {
      iccid,
      qrCode,
      activationCode,
      smdpAddress,
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Утилиты
  // ─────────────────────────────────────────────────────────────────────

  private async findOrderByIccid(iccid: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        iccid,
        status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] },
        parentOrderId: null,
      },
      include: {
        product: { select: { country: true, name: true } },
        user: { select: { id: true, telegramId: true } },
      },
    });

    if (!order) {
      this.logger.warn(`Webhook: заказ с ICCID=${iccid} не найден`);
    }

    return order;
  }

  private formatVolume(mb: number): string {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} ГБ`;
    return `${Math.round(mb)} МБ`;
  }

  private pickString(...candidates: unknown[]): string | null {
    for (const c of candidates) {
      if (c === null || c === undefined) continue;
      const s = String(c).trim();
      if (s) return s;
    }
    return null;
  }

  /**
   * Выбирает ключевые детали из webhook content в зависимости от типа события.
   */
  private extractWebhookDetails(
    type: string,
    content: EsimWebhookPayload['content'],
  ): Record<string, unknown> {
    if (!content) return {};
    switch (type) {
      case 'DATA_USAGE': {
        const totalMB = (content.totalVolume ?? 0) / 1024;
        const remainMB = (content.remain ?? 0) / 1024;
        return {
          total: this.formatVolume(totalMB),
          remain: this.formatVolume(remainMB),
          usedPercent: totalMB > 0 ? `${Math.round(((totalMB - remainMB) / totalMB) * 100)}%` : '—',
        };
      }
      case 'VALIDITY_USAGE':
        return { expiredTime: content.expiredTime };
      case 'ESIM_STATUS':
        return { esimStatus: content.esimStatus, smdpStatus: content.smdpStatus };
      case 'ORDER_STATUS':
        return { orderStatus: content.orderStatus };
      default:
        return {};
    }
  }
}
