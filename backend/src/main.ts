import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('eSIM Service API')
    .setDescription('API для сервиса продажи eSIM')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Аутентификация')
    .addTag('users', 'Пользователи')
    .addTag('products', 'Продукты (тарифы)')
    .addTag('orders', 'Заказы')
    .addTag('payments', 'Платежи')
    .addTag('referrals', 'Реферальная система')
    .addTag('loyalty', 'Программа лояльности')
    .addTag('analytics', 'Аналитика')
    .addTag('system-settings', 'Системные настройки')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
  🚀 Backend API запущен на http://localhost:${port}
  📚 Swagger документация: http://localhost:${port}/api/docs
  `);
}

bootstrap().catch((error) => {
  console.error('❌ Ошибка запуска:', error);
  process.exit(1);
});
