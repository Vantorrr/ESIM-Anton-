import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtUserGuard, JwtAdminGuard } from './jwt-user.guard';

/**
 * Общий модуль с JwtService и Guard'ами, чтобы любой модуль (Orders, Products, Payments)
 * мог защищать свои эндпоинты, не таща AuthModule в импорты (избегаем циклов).
 *
 * Помечен @Global, чтобы JwtUserGuard / JwtAdminGuard были доступны через DI везде.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  providers: [JwtUserGuard, JwtAdminGuard],
  exports: [JwtModule, JwtUserGuard, JwtAdminGuard],
})
export class SharedAuthModule {}
