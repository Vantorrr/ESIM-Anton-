# Шаг 1. Security headers и CORS

> [⬅️ Назад к фазе](../phase-9-api-security-infrastructure.md)

## Цель

Добавить стандартные security headers через `helmet` и ограничить CORS явным списком origins.

## Что нужно сделать

### 1.1 Установить и подключить helmet

- Выполнить `cd backend && npm install helmet`.
- В `backend/src/main.ts`:
  - Добавить `import helmet from 'helmet';` в начало файла.
  - Вызвать `app.use(helmet());` сразу после `NestFactory.create()`, до `setGlobalPrefix`.

```
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.use(helmet());
  app.setGlobalPrefix('api');
  // ...
}
```

### 1.2 Ограничить CORS

- В `backend/src/main.ts`:
  - Заменить `origin: process.env.CORS_ORIGIN || '*'` на `origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001', 'http://localhost:3002']`.

```
До:
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

После:
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  });
```

### 1.3 Обновить `.env.example`

- Добавить или обновить переменную `CORS_ORIGIN` с комментарием:

```
# Comma-separated list of allowed CORS origins
CORS_ORIGIN=https://admin.mojomobile.ru,https://mojomobile.ru,https://app.mojomobile.ru
```

## Результат шага

- Backend отдаёт security headers на каждый ответ.
- CORS ограничен явным списком доменов.

## Статус

Не начато

## Журнал изменений

(будет заполнено при реализации)

## Файлы

- `backend/src/main.ts`
- `backend/package.json` (новая зависимость `helmet`)
- `.env.example`

## Тестирование / Верификация

- `curl -I http://localhost:3000/api/products` → проверить заголовки:
  - `X-Content-Type-Options: nosniff` ✓
  - `X-Frame-Options: SAMEORIGIN` ✓
  - `X-DNS-Prefetch-Control: off` ✓
- Запрос с `Origin: https://evil.com` → CORS блокирует.
- Запрос с `Origin: http://localhost:3001` → CORS пропускает.
- `npm run build` — без ошибок.
