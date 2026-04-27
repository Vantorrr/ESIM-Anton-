import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { EmailService } from './email.service';

/**
 * NotificationsModule намеренно НЕ импортирует OrdersModule, чтобы не было
 * TS-цикла: UsersModule → NotificationsModule → OrdersModule → UsersModule.
 * Cron-мониторинг трафика вынесен в TrafficMonitorModule.
 */
@Module({
  providers: [PushService, EmailService],
  exports: [PushService, EmailService],
})
export class NotificationsModule {}
