import { Module, forwardRef } from '@nestjs/common';
import { PushService } from './push.service';
import { EmailService } from './email.service';
import { TrafficMonitorService } from './traffic-monitor.service';
import { OrdersModule } from '../orders/orders.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [forwardRef(() => OrdersModule), TelegramModule],
  providers: [PushService, EmailService, TrafficMonitorService],
  exports: [PushService, EmailService],
})
export class NotificationsModule {}
