import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import { OrderStatus } from '@prisma/client';

/**
 * Payload, приходящий от eSIM Access на наш webhook endpoint.
 *
 * Типы событий:
 * - DATA_USAGE:      использовано 80% или 100% трафика
 * - VALIDITY_USAGE:  осталось ≤ 1 день до истечения
 * - ESIM_STATUS:     смена статуса eSIM (IN_USE, INSTALLATION, и т.д.)
 */
export interface EsimWebhookPayload {
  notifyType: 'DATA_USAGE' | 'VALIDITY_USAGE' | 'ESIM_STATUS';
  content: {
    orderNo?: string;
    transactionId?: string;
    iccid: string;
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
  };
}

@Injectable()
export class EsimWebhookService {
  private readonly logger = new Logger(EsimWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private telegramNotification: TelegramNotificationService,
  ) {}

  /**
   * Обработка webhook от eSIM Access.
   * Вызывается контроллером на POST /esim-provider/webhook.
   */
  async handleWebhook(payload: EsimWebhookPayload): Promise<void> {
    const { notifyType, content } = payload;

    if (!content?.iccid) {
      this.logger.warn('Webhook без ICCID, пропускаем', JSON.stringify(payload));
      return;
    }

    this.logger.log(
      `📨 Webhook: type=${notifyType}, iccid=${content.iccid}`,
    );

    switch (notifyType) {
      case 'DATA_USAGE':
        await this.handleDataUsage(content);
        break;
      case 'VALIDITY_USAGE':
        await this.handleValidityUsage(content);
        break;
      case 'ESIM_STATUS':
        await this.handleEsimStatus(content);
        break;
      default:
        this.logger.warn(`Неизвестный тип webhook: ${notifyType}`);
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

    // Cooldown: не спамим чаще чем раз в 24ч
    if (order.lowTrafficNotifiedAt) {
      const hoursSince =
        (Date.now() - order.lowTrafficNotifiedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) return;
    }

    const totalMB = (content.totalVolume ?? 0) / 1024;
    const remainMB = (content.remain ?? 0) / 1024;
    const usedPercent = totalMB > 0 ? ((totalMB - remainMB) / totalMB) * 100 : 0;

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
}
