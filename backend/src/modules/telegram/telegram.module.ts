import { Module, Global } from '@nestjs/common';
import { TelegramNotificationService } from './telegram-notification.service';

@Global()
@Module({
  providers: [TelegramNotificationService],
  exports: [TelegramNotificationService],
})
export class TelegramModule {}
