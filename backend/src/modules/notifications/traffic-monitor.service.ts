import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import { OrderStatus } from '@prisma/client';

/**
 * Мониторинг расхода трафика на активных eSIM.
 *
 * Раз в час проходим по всем заказам со статусом PAID/COMPLETED, у которых уже
 * выдан ICCID. Запрашиваем актуальный usage у провайдера через OrdersService
 * (с кэшированием). Если остаток упал ниже порога — отправляем пользователю
 * уведомление в Telegram. Чтобы не спамить, фиксируем дату последнего
 * уведомления в order.lowTrafficNotifiedAt и не отправляем повторно раньше,
 * чем через NOTIFY_COOLDOWN_HOURS часов.
 *
 * Пороги настраиваются константами LOW_REMAINING_PERCENT / LOW_REMAINING_MB.
 */
@Injectable()
export class TrafficMonitorService {
  private readonly logger = new Logger(TrafficMonitorService.name);

  // Порог по проценту от общего объёма (если объём известен)
  private readonly LOW_REMAINING_PERCENT = 10;
  // Альтернативный порог по абсолютному значению (если процент посчитать нельзя)
  private readonly LOW_REMAINING_MB = 100;
  // Не отправлять повторное уведомление раньше, чем через N часов
  private readonly NOTIFY_COOLDOWN_HOURS = 24;
  // Максимум заказов, которые опрашиваем за один прогон, чтобы не положить
  // API провайдера. Остальные подхватим в следующий запуск.
  private readonly BATCH_SIZE = 50;

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private telegramNotification: TelegramNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async monitorTrafficLevels() {
    this.logger.log('🔎 Запуск мониторинга остатков трафика...');

    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] },
        iccid: { not: null },
      },
      orderBy: { lastUsageAt: { sort: 'asc', nulls: 'first' } },
      take: this.BATCH_SIZE,
      include: {
        product: true,
        user: { select: { id: true, telegramId: true } },
      },
    });

    let checked = 0;
    let notified = 0;

    for (const order of orders) {
      try {
        // force=false → используем кэш, но с maxAge=1 час, чтобы фактически
        // обновлять для большинства заказов раз в час
        const usage = await this.ordersService.getOrderUsage(order.id, 3600, false);
        checked++;

        if (!usage.available || usage.totalBytes === null || usage.remainingBytes === null) {
          continue;
        }

        const remainingMB = usage.remainingBytes / (1024 * 1024);
        const remainingPercent = (usage.remainingBytes / usage.totalBytes) * 100;
        const isLow =
          remainingPercent <= this.LOW_REMAINING_PERCENT ||
          remainingMB <= this.LOW_REMAINING_MB;

        if (!isLow) continue;

        // Проверяем cooldown
        if (order.lowTrafficNotifiedAt) {
          const hoursSince =
            (Date.now() - order.lowTrafficNotifiedAt.getTime()) / (1000 * 60 * 60);
          if (hoursSince < this.NOTIFY_COOLDOWN_HOURS) continue;
        }

        if (!order.user?.telegramId) continue;

        const totalMB = usage.totalBytes / (1024 * 1024);
        const remainingDisplay =
          remainingMB >= 1024
            ? `${(remainingMB / 1024).toFixed(2)} ГБ`
            : `${remainingMB.toFixed(0)} МБ`;
        const totalDisplay =
          totalMB >= 1024
            ? `${(totalMB / 1024).toFixed(0)} ГБ`
            : `${totalMB.toFixed(0)} МБ`;

        const text =
          `⚠️ <b>Низкий остаток трафика</b>\n\n` +
          `🌍 ${order.product.country} — ${order.product.dataAmount}\n` +
          `📉 Осталось: <b>${remainingDisplay}</b> из ${totalDisplay} ` +
          `(${remainingPercent.toFixed(0)}%)\n\n` +
          `Вы можете пополнить трафик прямо в приложении.`;

        await this.telegramNotification.sendTextNotification(
          order.user.telegramId,
          text,
          { openMyEsim: true },
        );

        await this.prisma.order.update({
          where: { id: order.id },
          data: { lowTrafficNotifiedAt: new Date() },
        });

        notified++;
      } catch (error: any) {
        this.logger.warn(`Ошибка мониторинга заказа ${order.id}: ${error.message}`);
      }
    }

    this.logger.log(
      `🔎 Мониторинг завершён: проверено ${checked} eSIM, уведомлений отправлено ${notified}`,
    );
  }
}
