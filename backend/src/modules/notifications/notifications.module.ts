import { Module } from '@nestjs/common';
import { PushService } from './push.service';
import { EmailService } from './email.service';

@Module({
  providers: [PushService, EmailService],
  exports: [PushService, EmailService],
})
export class NotificationsModule {}
