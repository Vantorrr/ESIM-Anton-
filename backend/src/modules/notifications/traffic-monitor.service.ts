import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import { OrderStatus } from '@prisma/client';

/**
 * Мониторинг расхода трафика на активных eSIM.
 *
 * Запускается раз в час (cron). Алгоритм:
 *   1. Берём активные eSIM (PAID/COMPLETED, есть ICCID), сортируем по
 *      lastUsageAt ASC NULLS FIRST — те, кого давно не опрашивали, идут первыми.
 *   2. Для каждой получаем usage через OrdersService.getOrderUsage (с TTL 1 час
 *      → фактически большинство заказов будут перезапрошены у провайдера).
 *   3. Между запросами — задержка throttleMs, чтобы не словить rate limit eSIM Access.
 *   4. Если остаток ниже порога (LOW_REMAINING_PERCENT или LOW_REMAINING_MB) и
 *      cooldown прошёл — отправляем Telegram-уведомление, фиксируем дату.
 *   5. Уведомления группируются по telegramId — если у юзера сразу несколько eSIM
 *      «при смерти», шлём ОДНО сообщение со списком, а не спамим N раз.
 *
 * Все пороги конфигурируются ENV-переменными (см. конструктор), значения по умолчанию
 * рассчитаны под средний кейс: 10% или 100MB остатка, 24ч cooldown, 50 eSIM за прогон.
 *
 * Если ENV TRAFFIC_MONITOR_ENABLED=false — крон не выполняется (для прод-отладки).
 */
@Injectable()
export class TrafficMonitorService {
  private readonly logger = new Logger(TrafficMonitorService.name);

  private readonly LOW_REMAINING_PERCENT: number;
  private readonly LOW_REMAINING_MB: number;
  private readonly NOTIFY_COOLDOWN_HOURS: number;
  private readonly BATCH_SIZE: number;
  private readonly THROTTLE_MS: number;
  private readonly ENABLED: boolean;

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private telegramNotification: TelegramNotificationService,
    private config: ConfigService,
  ) {
    this.LOW_REMAINING_PERCENT = Number(
      this.config.get('TRAFFIC_LOW_PERCENT') ?? 10,
    );
    this.LOW_REMAINING_MB = Number(this.config.get('TRAFFIC_LOW_MB') ?? 100);
    this.NOTIFY_COOLDOWN_HOURS = Number(
      this.config.get('TRAFFIC_NOTIFY_COOLDOWN_HOURS') ?? 24,
    );
    this.BATCH_SIZE = Number(this.config.get('TRAFFIC_BATCH_SIZE') ?? 50);
    this.THROTTLE_MS = Number(this.config.get('TRAFFIC_THROTTLE_MS') ?? 250);
    this.ENABLED = this.config.get('TRAFFIC_MONITOR_ENABLED') !== 'false';

    this.logger.log(
      `📊 TrafficMonitor: ENABLED=${this.ENABLED}, low=${this.LOW_REMAINING_PERCENT}% / ${this.LOW_REMAINING_MB}MB, ` +
        `cooldown=${this.NOTIFY_COOLDOWN_HOURS}h, batch=${this.BATCH_SIZE}, throttle=${this.THROTTLE_MS}ms`,
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async monitorTrafficLevels() {
    if (!this.ENABLED) {
      this.logger.debug('TrafficMonitor отключен (TRAFFIC_MONITOR_ENABLED=false)');
      return;
    }

    this.logger.log('🔎 Запуск мониторинга остатков трафика...');

    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] },
        iccid: { not: null },
        // Не мониторим заказы-пополнения (parentOrderId != null) — они сами
        // не имеют ICCID-владения, а usage родителя проверяется отдельно.
        parentOrderId: null,
      },
      orderBy: { lastUsageAt: { sort: 'asc', nulls: 'first' } },
      take: this.BATCH_SIZE,
      include: {
        product: true,
        user: { select: { id: true, telegramId: true } },
      },
    });

    let checked = 0;
    let lowDetected = 0;

    type LowItem = {
      orderId: string;
      country: string;
      remainingDisplay: string;
      totalDisplay: string;
      remainingPercent: number;
    };
    // Группируем низкие остатки по телеграм-id, чтобы отправить одно сообщение на юзера
    const lowByTelegramId = new Map<
      string,
      { lows: LowItem[]; orderIds: string[] }
    >();

    for (const order of orders) {
      try {
        // throttle между запросами к провайдеру
        if (checked > 0 && this.THROTTLE_MS > 0) {
          await this.sleep(this.THROTTLE_MS);
        }

        const usage = await this.ordersService.getOrderUsage(order.id, 3600, false);
        checked++;

        if (
          !usage.available ||
          usage.totalBytes === null ||
          usage.totalBytes === 0 ||
          usage.remainingBytes === null
        ) {
          continue;
        }

        const remainingMB = usage.remainingBytes / (1024 * 1024);
        const remainingPercent = (usage.remainingBytes / usage.totalBytes) * 100;
        const isLow =
          remainingPercent <= this.LOW_REMAINING_PERCENT ||
          remainingMB <= this.LOW_REMAINING_MB;

        if (!isLow) continue;

        if (order.lowTrafficNotifiedAt) {
          const hoursSince =
            (Date.now() - order.lowTrafficNotifiedAt.getTime()) / (1000 * 60 * 60);
          if (hoursSince < this.NOTIFY_COOLDOWN_HOURS) continue;
        }

        if (!order.user?.telegramId) continue;

        const totalMB = usage.totalBytes / (1024 * 1024);
        const totalDisplay = this.formatVolume(totalMB);
        const remainingDisplay = this.formatVolume(remainingMB);

        const tgId = order.user.telegramId.toString();
        if (!lowByTelegramId.has(tgId)) {
          lowByTelegramId.set(tgId, { lows: [], orderIds: [] });
        }
        const bucket = lowByTelegramId.get(tgId)!;
        bucket.lows.push({
          orderId: order.id,
          country: order.product.country,
          remainingDisplay,
          totalDisplay,
          remainingPercent,
        });
        bucket.orderIds.push(order.id);
        lowDetected++;
      } catch (error: any) {
        this.logger.warn(`Ошибка мониторинга заказа ${order.id}: ${error.message}`);
      }
    }

    let notified = 0;
    for (const [telegramId, { lows, orderIds }] of lowByTelegramId) {
      try {
        const text = this.buildLowTrafficMessage(lows);
        await this.telegramNotification.sendTextNotification(telegramId, text, {
          openMyEsim: true,
        });

        await this.prisma.order.updateMany({
          where: { id: { in: orderIds } },
          data: { lowTrafficNotifiedAt: new Date() },
        });
        notified++;
      } catch (error: any) {
        this.logger.warn(`Уведомление пользователю ${telegramId} не отправлено: ${error.message}`);
      }
    }

    this.logger.log(
      `🔎 Мониторинг завершён: проверено ${checked} eSIM, ` +
        `низких остатков ${lowDetected}, уведомлено пользователей ${notified}`,
    );
  }

  private buildLowTrafficMessage(
    lows: Array<{
      country: string;
      remainingDisplay: string;
      totalDisplay: string;
      remainingPercent: number;
    }>,
  ): string {
    if (lows.length === 1) {
      const l = lows[0];
      return (
        `⚠️ <b>Низкий остаток трафика</b>\n\n` +
        `🌍 ${l.country}\n` +
        `📉 Осталось: <b>${l.remainingDisplay}</b> из ${l.totalDisplay} ` +
        `(${l.remainingPercent.toFixed(0)}%)\n\n` +
        `Можно пополнить прямо в приложении.`
      );
    }
    const lines = lows.map(
      (l) =>
        `• 🌍 <b>${l.country}</b>: ${l.remainingDisplay} из ${l.totalDisplay} ` +
        `(${l.remainingPercent.toFixed(0)}%)`,
    );
    return (
      `⚠️ <b>Низкий остаток трафика</b>\n\n` +
      `На ${lows.length} ваших eSIM осталось мало трафика:\n\n` +
      lines.join('\n') +
      `\n\nМожно пополнить любую из них прямо в приложении.`
    );
  }

  private formatVolume(mb: number): string {
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} ГБ`;
    return `${Math.round(mb)} МБ`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
