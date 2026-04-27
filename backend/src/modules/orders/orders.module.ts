import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';
import { EsimProviderModule } from '../esim-provider/esim-provider.module';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { TelegramModule } from '../telegram/telegram.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    ProductsModule,
    UsersModule,
    EsimProviderModule,
    PromoCodesModule,
    TelegramModule,
    SystemSettingsModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
