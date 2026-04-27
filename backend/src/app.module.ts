import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { SharedAuthModule } from './common/auth/auth.shared-module';

// Модули
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { EsimProviderModule } from './modules/esim-provider/esim-provider.module';
import { SystemSettingsModule } from './modules/system-settings/system-settings.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PromoCodesModule } from './modules/promo-codes/promo-codes.module';

@Module({
  imports: [
    // Конфигурация
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),

    // Планировщик задач (cron jobs)
    ScheduleModule.forRoot(),

    // База данных
    PrismaModule,

    // Общий JwtModule + Guard'ы (доступны глобально)
    SharedAuthModule,

    // Бизнес-модули
    AuthModule,
    UsersModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    ReferralsModule,
    LoyaltyModule,
    AnalyticsModule,
    EsimProviderModule,
    SystemSettingsModule,
    TelegramModule,
    NotificationsModule,
    PromoCodesModule,
  ],
})
export class AppModule {}
