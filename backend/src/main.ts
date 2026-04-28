// Force rebuild timestamp: 2026-01-14T17:20:00Z
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

// Фикс для сериализации BigInt в JSON (telegramId из Prisma)
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

/**
 * Сохраняем raw тело запроса в `req.rawBody` для эндпоинтов, где нужна
 * проверка HMAC по точному байтовому представлению (CloudPayments-вебхуки).
 * Прицельно оборачиваем только URL-encoded и JSON парсеры, остальной мир
 * (multipart, etc.) мы не трогаем.
 */
const rawBodyVerify = (req: any, _res: any, buf: Buffer) => {
  if (buf?.length) {
    req.rawBody = buf;
  }
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Подключаем парсеры с verify, чтобы получить rawBody
  app.use(json({ verify: rawBodyVerify, limit: '10mb' }));
  app.use(urlencoded({ extended: true, verify: rawBodyVerify, limit: '10mb' }));

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
    .setTitle('Mojo mobile API')
    .setDescription('API для сервиса Mojo mobile')
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
