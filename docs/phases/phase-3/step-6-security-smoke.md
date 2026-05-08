# Шаг 6. Провести security smoke

> [⬅️ Назад к фазе](../phase-3-admin-auth-and-api-security.md)

## Цель

Доказать, что все уязвимости Phase 3 устранены, и admin UI продолжает работать корректно.

## Что нужно сделать

### 6.1 Build & Test

- `npm run build` — сборка backend без ошибок.
- `npm run test` — все unit тесты green.
- Обновить существующие spec-файлы, если guard assertions изменились.

### 6.2 Негативные тесты (без токена)

Каждый из следующих запросов должен вернуть `401`:

- `POST /api/auth/register-admin`
- `GET /api/analytics/dashboard`
- `GET /api/analytics/top-products`
- `GET /api/analytics/sales-chart?dateFrom=2026-01-01&dateTo=2026-12-31`
- `GET /api/system-settings`
- `POST /api/system-settings/pricing`
- `POST /api/system-settings/referral`
- `GET /api/users`
- `GET /api/users/<any-id>`
- `GET /api/payments`
- `POST /api/products/sync`
- `POST /api/products/reprice`
- `POST /api/products`
- `PUT /api/products/<any-id>`
- `DELETE /api/products/<any-id>`
- `POST /api/esim-provider/purchase`
- `POST /api/esim-provider/sync`
- `GET /api/orders/<any-id>`
- `PATCH /api/orders/<any-id>/cancel`
- `GET /api/payments/cloudpayments/test-notify`

### 6.3 Позитивные тесты (с admin JWT)

- Login admin → получить JWT.
- С JWT: `GET /api/analytics/dashboard` → `200`.
- С JWT: `GET /api/system-settings` → `200`.
- С JWT: `GET /api/users` → `200`.
- С JWT: `GET /api/payments` → `200`.
- С JWT: `GET /api/esim-provider/health` → `200` или provider-level health response.
- С JWT: `GET /api/orders/<any-id>` → `200`.

### 6.4 Публичные endpoints (без токена — должны работать)

- `GET /api/products` → `200`
- `GET /api/products/countries` → `200`
- `GET /api/products/<existing-id>` → `200`
- `POST /api/auth/login` → `200` (с валидными credentials) / `401` (с невалидными)
- `POST /api/auth/phone/send-code` → ответ (может быть ошибка SMS, но не 401)

### 6.4.1 User ownership tests

- Получить user JWT.
- `GET /api/orders/<own-order-id>` → `200`.
- `GET /api/orders/<other-order-id>` → `403`.
- `GET /api/orders/user/<own-user-id>` → `200`.
- `GET /api/orders/user/<other-user-id>` → `403`.
- `GET /api/orders/user/<own-user-id>/check-new` → `200`.
- `GET /api/payments/user/<own-user-id>` → `200`.
- `GET /api/payments/user/<other-user-id>` → `403`.
- `POST /api/payments/create` с чужим `orderId` → `403`.
- `PATCH /api/users/me/email` с валидным user JWT → `200`; с поддельным JWT payload без валидной подписи → `401`.

### 6.4.2 Bot/internal token tests

- `POST /api/users/find-or-create` без `x-telegram-bot-token` → `401`/`403`.
- `POST /api/users/find-or-create` с валидным `x-telegram-bot-token` → `200`.
- Bot smoke: `/start` не падает на middleware `findOrCreate`.

### 6.5 Token confusion тест

- Получить user JWT (через phone/OAuth).
- С user JWT: `GET /api/analytics/dashboard` → `401` (не admin token).
- С user JWT: `POST /api/system-settings/pricing` → `401`.

### 6.6 Role check тест

- Создать admin с ролью `SUPPORT`.
- С SUPPORT JWT: `POST /api/auth/register-admin` → `403` (только SUPER_ADMIN).

### 6.7 Admin UI end-to-end

- Открыть admin UI → login form.
- Ввести admin credentials → dashboard загружается.
- Переключить все вкладки: Dashboard, Orders, Users, Products, Promo, Settings.
- Выполнить хотя бы одну write операцию (например, toggle promo code).
- Logout → all tabs show login form.

### 6.8 Client Mini App smoke

- Phone/Telegram auth → `/my-esim` загружает свои заказы.
- `/orders` загружает только свои заказы.
- `/order/<own-id>` открывается; `/order/<other-id>` возвращает controlled forbidden/error state.
- `/balance` загружает баланс и свои транзакции.
- Покупка с `paymentMethod=card` создаёт order и payment только для текущего пользователя.
- Покупка с 100% promo не требует admin JWT на client path.

## Результат шага

Все CRITICAL и HIGH уязвимости из security audit подтверждены как устранённые. Admin UI работает корректно с backend JWT protection.

## Статус

Частично выполнено: backend/manual access smoke подтверждён, browser smoke частично подтверждён, повторный clean client pass pending

## Журнал изменений

- **[2026-05-08]**
  - `npm test -- --runInBand` в `backend/` прошёл: 14 suites, 125 tests green.
  - `npx nest build` в `backend/` прошёл успешно.
  - `npm run build` в `backend/` упирается в Windows file lock во время `prisma generate` (`query_engine-windows.dll.node` rename), а не в TypeScript compile phase.
  - Backend HTTP smoke подтверждён:
    - anonymous access к `register-admin`, `analytics`, `system-settings`, `users`, `payments`, mutating `products`, `esim-provider`, `orders/:id`, `orders/:id/cancel`, `payments/cloudpayments/test-notify` возвращает `401`;
    - публичные `GET /products`, `GET /products/countries`, `GET /products/:id` возвращают `200`;
    - admin JWT даёт `200` на `analytics/dashboard`, `system-settings`, `users`, `payments`, `esim-provider/health`;
    - user ownership tests дают ожидаемые `200/403` для `orders`, `payments/user/:userId`, `users/:id`, `payments/create`, `users/me/email`;
    - bot service-token contract подтверждён: `users/find-or-create` без header → `401`, с валидным `x-telegram-bot-token` → `200`;
    - token confusion подтверждён: user JWT на admin routes → `401`;
    - role check подтверждён: `SUPER_ADMIN` может создать `SUPPORT` (`201`), `SUPPORT` не может вызвать `register-admin` (`403`).
  - Browser smoke:
    - `admin` login seed-админом проходит; dashboard и защищённые tabs `Orders` / `Users` читают backend data под JWT и не вылетают в login.
    - `client` root и публичный каталог открываются; авторизованный `/orders` и `/balance` открываются после инъекции реального user JWT/localStorage state и показывают owner data.
  - Во время browser smoke найден и исправлен follow-up regression: `client/components/TelegramRedirectHandler.tsx` больше не дёргает `/auth/me` без сохранённого JWT после перевода `userApi.getMe()` на user-authenticated contract.
  - Dev `client` runtime оказался нестабилен после hot-reload/build churn (`next dev` локально отдавал `404/500` на `/` и `Cannot find module './954.js'` внутри `.next/server`). Для clean pass был поднят production build на `http://localhost:3102`: root открылся корректно, а console вместо `401 /auth/me` показывает benign `Skip new-order check: no user JWT in storage yet`.
  - Не покрыты в этой сессии: реальный bot startup `/start` smoke, client path покупки с `paymentMethod=card`, path с `100% promo`.

## Файлы

(smoke — нет файловых изменений, только тестирование)

## Тестирование / Верификация

- Все сценарии из секций 6.1-6.7 выше.
- Результаты smoke зафиксировать в журнале этого шага.
