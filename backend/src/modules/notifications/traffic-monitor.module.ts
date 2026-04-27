import { Module } from '@nestjs/common';
import { TrafficMonitorService } from './traffic-monitor.service';
import { OrdersModule } from '../orders/orders.module';
import { TelegramModule } from '../telegram/telegram.module';

/**
 * Отдельный модуль для cron-задачи мониторинга трафика.
 *
 * Вынесен из NotificationsModule, чтобы не создавать TS-цикл импортов:
 * UsersModule → NotificationsModule → OrdersModule → UsersModule.
 *
 * Этот модуль зависит от OrdersModule, но никто из «верхних» модулей
 * (UsersModule, AuthModule и т.п.) от него не зависит — цикла нет.
 */
@Module({
  imports: [OrdersModule, TelegramModule],
  providers: [TrafficMonitorService],
})
export class TrafficMonitorModule {}
