# Шаг 2. Swagger и test-notify

> [⬅️ Назад к фазе](../phase-9-api-security-infrastructure.md)

## Цель

Скрыть Swagger UI в production и закрыть отладочный endpoint `test-notify`.

## Что нужно сделать

### 2.1 Скрыть Swagger в production

- В `backend/src/main.ts`:
  - Обернуть создание Swagger document и `SwaggerModule.setup()` в условие `if (process.env.NODE_ENV !== 'production')`.

```
До:
  const config = new DocumentBuilder()
    .setTitle('eSIM Service API')
    // ...
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

После:
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('eSIM Service API')
      // ...
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }
```

### 2.2 Защитить `test-notify` endpoint

- В `backend/src/modules/payments/cloudpayments.controller.ts`:
  - Добавить `@UseGuards(JwtAdminGuard)` на метод `testNotify()`.
  - Импортировать `UseGuards` из `@nestjs/common`, `JwtAdminGuard` из `@/common/auth/jwt-user.guard`.

```
@Get('test-notify')
@UseGuards(JwtAdminGuard)
@ApiOperation({ summary: 'Test Telegram notification' })
async testNotify(@Query('telegramId') telegramId: string) { ... }
```

## Результат шага

- Swagger UI недоступен при `NODE_ENV=production`.
- `test-notify` требует admin JWT.

## Статус

Не начато

## Журнал изменений

(будет заполнено при реализации)

## Файлы

- `backend/src/main.ts`
- `backend/src/modules/payments/cloudpayments.controller.ts`

## Тестирование / Верификация

- `NODE_ENV=production node dist/main.js` → `GET /api/docs` → 404.
- `NODE_ENV=development npm run start:dev` → `GET /api/docs` → Swagger UI.
- `curl http://localhost:3000/api/payments/cloudpayments/test-notify?telegramId=123` → `401`.
- `curl -H 'Authorization: Bearer <admin_jwt>' 'http://localhost:3000/api/payments/cloudpayments/test-notify?telegramId=123'` → ответ.
- `npm run build` — без ошибок.
