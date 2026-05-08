# Шаг 4. Закрыть HIGH endpoints guard'ами + исправить IDOR

> [⬅️ Назад к фазе](../phase-3-admin-auth-and-api-security.md)

## Цель

Устранить 5 HIGH уязвимостей: незащищённые endpoints в `Users`, `Payments`, `Products`, `Orders`, и IDOR в `updateMyEmail`.

## Что нужно сделать

### 4.1 `UsersController` — guards на admin endpoints

- `GET /users` → `@UseGuards(JwtAdminGuard)`
- `GET /users/:id` → mixed route: admin видит любого пользователя, user видит только себя.
  - Вариант A: `OrGuard([JwtAdminGuard, JwtUserGuard])` + `if (!isAdmin(user) && user.id !== id) throw ForbiddenException`.
  - Вариант B: оставить `GET /users/:id` admin-only и добавить `GET /users/me` под `JwtUserGuard`; одновременно обновить client callers.
- `GET /users/:id/stats` → `@UseGuards(JwtAdminGuard)`
- `POST /users/find-or-create` → **не `JwtAdminGuard`**. Endpoint используется bot runtime; закрыть через `ServiceTokenGuard` по `x-telegram-bot-token`. Если client всё ещё вызывает этот route, выделить client-safe replacement через `/auth/me`/`/users/me`.
- `POST /users/:id/push/subscribe` → `@UseGuards(JwtUserGuard)` + `user.id === id`
- `DELETE /users/:id/push/unsubscribe` → `@UseGuards(JwtUserGuard)` + `user.id === id`
- Импортировать `UseGuards` из `@nestjs/common`, `JwtAdminGuard`, `JwtUserGuard`, `CurrentUser`, `AuthUser` из `@/common/auth/jwt-user.guard`.

### 4.1.1 `ServiceTokenGuard` для bot/internal requests

- Создать guard, который сверяет `x-telegram-bot-token` с `TELEGRAM_BOT_TOKEN` из `ConfigService`.
- Переиспользовать его для bot-only mutations (`/users/find-or-create`, уже защищённый `/referrals/register` можно оставить inline или перевести на guard).
- В `bot/src/api.ts` добавить header глобально для всех backend requests:

```typescript
headers: {
  'Content-Type': 'application/json',
  'x-telegram-bot-token': config.botToken,
}
```

### 4.2 `UsersController` — исправить IDOR в `updateMyEmail`

- Заменить ручной парсинг JWT (строка `Buffer.from(token.split('.')[1], 'base64url')`) на `@UseGuards(JwtUserGuard)` + `@CurrentUser()`.
- Удалить ручной разбор `authorization` header.
- Использовать `user.id` из `@CurrentUser()`.

```
До:
  @Patch('me/email')
  async updateMyEmail(@Headers('authorization') authHeader: string, @Body() dto) {
    // ручной парсинг JWT БЕЗ проверки подписи
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    userId = payload.sub;
  }

После:
  @Patch('me/email')
  @UseGuards(JwtUserGuard)
  async updateMyEmail(@CurrentUser() user: AuthUser, @Body() dto: { email: string }) {
    return serializeUser(await this.usersService.updateEmail(user.id, dto.email));
  }
```

### 4.3 `PaymentsController` — guards

- `POST /payments/create` → `@UseGuards(JwtUserGuard)` + ownership check по `orderId`.
  - Handler должен принимать `@CurrentUser() user`.
  - Service или controller должен проверить, что найденный заказ принадлежит `user.id`.
  - Чужой `orderId` → `403`, не `paymentUrl`.
- `GET /payments` → `@UseGuards(JwtAdminGuard)`
- `GET /payments/user/:userId` → mixed route: admin видит любого пользователя, user видит только себя. Предпочтительно `OrGuard([JwtAdminGuard, JwtUserGuard])` + `user.id === userId` для user token.

### 4.4 `ProductsController` — guards на мутирующие endpoints

Оставить **публичными**:
- `GET /products` — клиентский каталог
- `GET /products/countries` — список стран
- `GET /products/:id` — деталь продукта

Добавить `@UseGuards(JwtAdminGuard)` на:
- `POST /products/sync`
- `POST /products/bulk/toggle-active`
- `POST /products/bulk/toggle-by-type`
- `POST /products/bulk/set-badge`
- `POST /products/bulk/set-markup`
- `POST /products/reprice`
- `POST /products` (create)
- `PUT /products/:id` (update)
- `DELETE /products/:id` (delete)

### 4.5 `OrdersController` — guards + ownership

- Создать `OrGuard([JwtAdminGuard, JwtUserGuard])` или разнести admin/user routes.
- `GET /orders/:id` → admin видит любой заказ; user видит только свой (`ordersService.assertOwnership(id, user.id)`).
- `GET /orders/user/:userId` → admin видит любого пользователя; user видит только себя (`user.id === userId`).
- `GET /orders/user/:userId/check-new` → `@UseGuards(JwtUserGuard)` + проверка `user.id === userId`
- `POST /orders/:id/fulfill-free` → не оставлять blind admin-only, если client продолжает вызывать endpoint при 100% promo.
  - Предпочтительно перенести free-order fulfillment внутрь `POST /orders`, когда `totalAmount <= 0`.
  - Если endpoint остаётся, разрешить admin OR owner и проверить: заказ принадлежит user, `totalAmount === 0`, статус допускает fulfillment.

### 4.6 `CloudPaymentsController` — guard на test-notify

- `GET /payments/cloudpayments/test-notify` → `@UseGuards(JwtAdminGuard)`

## Результат шага

- Все admin-facing endpoints возвращают `401` без admin JWT.
- User-facing mixed endpoints требуют user JWT и ownership; чужие ресурсы возвращают `403`.
- Bot `find-or-create` продолжает работать с service token и не требует admin JWT.
- IDOR в `updateMyEmail` устранён.
- Публичные client-facing endpoints (каталог, OAuth) продолжают работать.
- `test-notify` закрыт для анонимного доступа.

## Статус

Не начато

## Журнал изменений

(будет заполнено при реализации)

## Файлы

- `backend/src/modules/users/users.controller.ts`
- `backend/src/common/auth/service-token.guard.ts` [NEW]
- `backend/src/common/auth/or.guard.ts` [NEW или equivalent route split]
- `backend/src/modules/payments/payments.controller.ts`
- `backend/src/modules/products/products.controller.ts`
- `backend/src/modules/orders/orders.controller.ts`
- `backend/src/modules/payments/cloudpayments.controller.ts`
- `bot/src/api.ts`

## Тестирование / Верификация

- `curl http://localhost:3000/api/users` → `401`
- `curl http://localhost:3000/api/payments` → `401`
- `curl -X POST http://localhost:3000/api/products/sync` → `401`
- `curl http://localhost:3000/api/products` → `200` (публичный каталог)
- `curl http://localhost:3000/api/products/countries` → `200` (публичный)
- `curl http://localhost:3000/api/orders/user/some-id` → `401`
- `curl -H 'Authorization: Bearer <user_jwt>' http://localhost:3000/api/orders/user/<own-user-id>` → `200`
- `curl -H 'Authorization: Bearer <user_jwt>' http://localhost:3000/api/orders/user/<other-user-id>` → `403`
- `curl -X POST -H 'Authorization: Bearer <user_jwt>' http://localhost:3000/api/payments/create -d '{"orderId":"<other-order-id>"}'` → `403`
- Bot smoke: `/start` creates/finds user through `/users/find-or-create` with `x-telegram-bot-token`.
- `curl http://localhost:3000/api/payments/cloudpayments/test-notify` → `401`
- IDOR тест: `PATCH /api/users/me/email` с поддельным JWT (невалидная подпись) → `401`
- `npm run build` — без ошибок
- Admin UI: login → все вкладки (dashboard, orders, users, products, promo, settings) работают
- Client smoke: `/orders`, `/my-esim`, `/balance`, `/order/<id>`, `/topup/<id>` не ломаются после guards.
