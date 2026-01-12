import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';

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

@Module({
  imports: [
    // Конфигурация
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),

    // База данных
    PrismaModule,

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
  ],
})
export class AppModule {}
