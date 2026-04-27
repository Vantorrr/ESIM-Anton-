import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { CloudPaymentsService } from './cloudpayments.service';
import { CloudPaymentsController } from './cloudpayments.controller';
import { OrdersModule } from '../orders/orders.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    forwardRef(() => OrdersModule),
    UsersModule,
    NotificationsModule,
    TelegramModule,
  ],
  controllers: [PaymentsController, CloudPaymentsController],
  providers: [PaymentsService, CloudPaymentsService],
  exports: [PaymentsService, CloudPaymentsService],
})
export class PaymentsModule {}
