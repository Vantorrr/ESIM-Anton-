# Шаг 1. Зафиксировать текущую auth-карту (обновлённый аудит)

> [⬅️ Назад к фазе](../phase-3-admin-auth-and-api-security.md)

## Цель

Иметь полную и актуальную карту защиты всех backend controllers: что защищено, что публично, что должно быть закрыто.

## Что нужно сделать

- Проверить все backend controllers на наличие `@UseGuards`.
- Классифицировать каждый endpoint как `admin-only`, `user-only`, `public` или `internal`.
- Зафиксировать расхождения между `@ApiBearerAuth()` (Swagger-декоратор) и реальной защитой.
- Обновить audit findings в журнале.

## Результат шага

Документирована полная auth-карта всех controllers с рекомендациями по каждому endpoint.

## Статус

✅ Выполнено (Аудит обновлён 2026-05-08)

## Журнал изменений

- **[2026-05-07]** Первичный аудит. Обнаружено: большинство write endpoints не имеют guards.
- **[2026-05-08]** Полный security audit по OWASP Top 10:2025. Результаты:

### Auth-карта контроллеров

| Контроллер | Текущие guards | Целевое состояние |
|-----------|---------------|-------------------|
| `AuthController` | ❌ Нет на `register-admin` | `JwtAdminGuard` + role check |
| `AnalyticsController` | ❌ Полностью открыт | `JwtAdminGuard` на контроллере |
| `SystemSettingsController` | ❌ Полностью открыт | `JwtAdminGuard` на контроллере |
| `UsersController` | ❌ Полностью открыт | `JwtAdminGuard` на admin endpoints |
| `PaymentsController` | ⚠️ Только `balance/topup` | `JwtAdminGuard` на admin endpoints |
| `ProductsController` | ⚠️ Только `dedupe` | `JwtAdminGuard` на все мутирующие |
| `OrdersController` | ⚠️ Частично | `JwtAdminGuard` на admin, ownership на user |
| `EsimProviderController` | ❌ Полностью открыт | `JwtAdminGuard` на provider/admin endpoints |
| `PromoCodesController` | ✅ Все с `JwtAdminGuard` | Без изменений |
| `LoyaltyController` | ✅ Все с guards | Без изменений |
| `ReferralsController` | ✅ Все с guards | Без изменений |
| `CloudPaymentsController` | ✅ HMAC verification | Без изменений |

### Дополнительные находки

- `updateMyEmail` в `UsersController` парсит JWT вручную **без проверки подписи** — IDOR уязвимость.
- Admin JWT не содержит `type: 'admin'` — нет чёткого разделения с user tokens.
- `JwtAdminGuard` проверяет наличие `role`, но не проверяет whitelist допустимых ролей.
- `POST /esim-provider/purchase` позволяет прямую provider purchase операцию вне order/payment lifecycle и должен быть admin/internal-only.
- Mixed routes (`orders/:id`, `orders/user/:userId`, `payments/user/:userId`, `users/:id`) нельзя закрывать только `JwtAdminGuard` без правки client: требуется ownership model.
- Bot `/users/find-or-create` нельзя переводить на admin JWT: нужен service-token guard, совместимый с `bot/src/api.ts`.

## Файлы

- `backend/src/modules/**/*.controller.ts`
- `backend/src/common/auth/jwt-user.guard.ts`
- `backend/src/modules/auth/auth.service.ts`
- `admin/app/page.tsx`
- `admin/lib/api.ts`

## Тестирование / Верификация

- Аудит завершён. Выводы зафиксированы в таблице выше.
