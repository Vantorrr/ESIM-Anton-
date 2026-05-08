# Шаг 4. Rate limiting

> [⬅️ Назад к фазе](../phase-9-api-security-infrastructure.md)

## Цель

Защитить auth endpoints от brute-force и SMS bombing. Исключить webhooks из throttle.

## Что нужно сделать

### 4.1 Установить @nestjs/throttler

- Выполнить `cd backend && npm install @nestjs/throttler`.

### 4.2 Глобальный throttle

- В `backend/src/app.module.ts`:
  - Импортировать `ThrottlerModule` и `ThrottlerGuard` из `@nestjs/throttler`.
  - Импортировать `APP_GUARD` из `@nestjs/core`.
  - Добавить `ThrottlerModule.forRoot()` в `imports`.
  - Добавить `ThrottlerGuard` как глобальный guard через `APP_GUARD`.

```typescript
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,   // 1 минута
      limit: 60,    // 60 запросов в минуту (мягкий глобальный лимит)
    }]),
    // ... остальные imports
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
```

### 4.3 Жёсткие лимиты на auth endpoints

- В `backend/src/modules/auth/auth.controller.ts`:
  - Импортировать `Throttle` из `@nestjs/throttler`.
  - Добавить жёсткие лимиты на:
    - `POST /auth/login` → `@Throttle({ default: { ttl: 60000, limit: 5 } })` (5 попыток в минуту)
    - `POST /auth/phone/send-code` → `@Throttle({ default: { ttl: 60000, limit: 3 } })` (3 SMS в минуту)

### 4.4 Исключить webhooks из throttle

- В `backend/src/modules/payments/cloudpayments.controller.ts`:
  - Импортировать `SkipThrottle` из `@nestjs/throttler`.
  - Добавить `@SkipThrottle()` **на уровне контроллера**.

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('payments/cloudpayments')
export class CloudPaymentsController { ... }
```

- Аналогично для Robokassa webhook handler (если существует отдельный контроллер).
- Проверить `payments.controller.ts` → `POST /payments/webhook` → добавить `@SkipThrottle()` на метод, если есть.

## Результат шага

- Глобальный rate limit 60 req/min.
- Auth login: 5 попыток в минуту.
- SMS: 3 запроса в минуту.
- Webhooks: без ограничений.

## Статус

Не начато

## Журнал изменений

(будет заполнено при реализации)

## Файлы

- `backend/package.json` (новая зависимость `@nestjs/throttler`)
- `backend/src/app.module.ts`
- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/payments/cloudpayments.controller.ts`
- `backend/src/modules/payments/payments.controller.ts` (если есть webhook handler)

## Тестирование / Верификация

- Выполнить 6 последовательных `POST /api/auth/login` за < 60 сек → 6-й запрос → `429 Too Many Requests`.
- Выполнить 4 последовательных `POST /api/auth/phone/send-code` → 4-й → `429`.
- `POST /api/payments/cloudpayments/pay` — 100 запросов подряд → все проходят (SkipThrottle).
- `GET /api/products` — 61 запрос за минуту → 61-й → `429` (глобальный лимит).
- `npm run build` — без ошибок.
- `npm run test` — все тесты green.
