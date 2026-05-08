# Шаг 4. Закрыть HIGH endpoints guard'ами + исправить IDOR

> [⬅️ Назад к фазе](../phase-3-admin-auth-and-api-security.md)

## Цель

Устранить 5 HIGH уязвимостей: незащищённые endpoints в `Users`, `Payments`, `Products`, `Orders`, и IDOR в `updateMyEmail`.

## Что нужно сделать

### 4.1 `UsersController` — guards на admin endpoints

- `GET /users` → `@UseGuards(JwtAdminGuard)`
- `GET /users/:id` → `@UseGuards(JwtAdminGuard)`
- `GET /users/:id/stats` → `@UseGuards(JwtAdminGuard)`
- `POST /users/find-or-create` → `@UseGuards(JwtAdminGuard)` (временная мера; используется ботом — проверить совместимость)
- `POST /users/:id/push/subscribe` → `@UseGuards(JwtUserGuard)`
- `DELETE /users/:id/push/unsubscribe` → `@UseGuards(JwtUserGuard)`
- Импортировать `UseGuards` из `@nestjs/common`, `JwtAdminGuard`, `JwtUserGuard`, `CurrentUser`, `AuthUser` из `@/common/auth/jwt-user.guard`.

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

- `POST /payments/create` → `@UseGuards(JwtUserGuard)` (пользователь создаёт платёж для своего заказа)
- `GET /payments` → `@UseGuards(JwtAdminGuard)`
- `GET /payments/user/:userId` → `@UseGuards(JwtAdminGuard)`

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

- `GET /orders/:id` → `@UseGuards(JwtAdminGuard)` (админские просмотры; клиентский flow через usage endpoint)
- `GET /orders/user/:userId` → `@UseGuards(JwtAdminGuard)`
- `GET /orders/user/:userId/check-new` → `@UseGuards(JwtUserGuard)` + проверка `user.id === userId`

### 4.6 `CloudPaymentsController` — guard на test-notify

- `GET /payments/cloudpayments/test-notify` → `@UseGuards(JwtAdminGuard)`

## Результат шага

- Все admin-facing endpoints возвращают `401` без admin JWT.
- IDOR в `updateMyEmail` устранён.
- Публичные client-facing endpoints (каталог, OAuth) продолжают работать.
- `test-notify` закрыт для анонимного доступа.

## Статус

Не начато

## Журнал изменений

(будет заполнено при реализации)

## Файлы

- `backend/src/modules/users/users.controller.ts`
- `backend/src/modules/payments/payments.controller.ts`
- `backend/src/modules/products/products.controller.ts`
- `backend/src/modules/orders/orders.controller.ts`
- `backend/src/modules/payments/cloudpayments.controller.ts`

## Тестирование / Верификация

- `curl http://localhost:3000/api/users` → `401`
- `curl http://localhost:3000/api/payments` → `401`
- `curl -X POST http://localhost:3000/api/products/sync` → `401`
- `curl http://localhost:3000/api/products` → `200` (публичный каталог)
- `curl http://localhost:3000/api/products/countries` → `200` (публичный)
- `curl http://localhost:3000/api/orders/user/some-id` → `401`
- `curl http://localhost:3000/api/payments/cloudpayments/test-notify` → `401`
- IDOR тест: `PATCH /api/users/me/email` с поддельным JWT (невалидная подпись) → `401`
- `npm run build` — без ошибок
- Admin UI: login → все вкладки (dashboard, orders, users, products, promo, settings) работают
