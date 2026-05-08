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
- `GET /api/orders/<any-id>`
- `PATCH /api/orders/<any-id>/cancel`
- `GET /api/payments/cloudpayments/test-notify`

### 6.3 Позитивные тесты (с admin JWT)

- Login admin → получить JWT.
- С JWT: `GET /api/analytics/dashboard` → `200`.
- С JWT: `GET /api/system-settings` → `200`.
- С JWT: `GET /api/users` → `200`.
- С JWT: `GET /api/payments` → `200`.

### 6.4 Публичные endpoints (без токена — должны работать)

- `GET /api/products` → `200`
- `GET /api/products/countries` → `200`
- `GET /api/products/<existing-id>` → `200`
- `POST /api/auth/login` → `200` (с валидными credentials) / `401` (с невалидными)
- `POST /api/auth/phone/send-code` → ответ (может быть ошибка SMS, но не 401)

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

## Результат шага

Все CRITICAL и HIGH уязвимости из security audit подтверждены как устранённые. Admin UI работает корректно с backend JWT protection.

## Статус

Не начато (блокировано шагами 3-5)

## Журнал изменений

(будет заполнено при реализации)

## Файлы

(smoke — нет файловых изменений, только тестирование)

## Тестирование / Верификация

- Все сценарии из секций 6.1-6.7 выше.
- Результаты smoke зафиксировать в журнале этого шага.
