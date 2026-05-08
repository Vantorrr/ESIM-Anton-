# Шаг 3. Закрыть CRITICAL endpoints guard'ами

> [⬅️ Назад к фазе](../phase-3-admin-auth-and-api-security.md)

## Цель

Устранить 3 CRITICAL уязвимости: открытый `register-admin`, незащищённые `SystemSettings` и `Analytics` контроллеры.

## Что нужно сделать

### 3.1 Защитить `POST /auth/register-admin`

- Добавить `@UseGuards(JwtAdminGuard)` на метод `registerAdmin()` в `auth.controller.ts`.
- Добавить `@CurrentUser()` и проверку `caller.role !== 'SUPER_ADMIN'` → `ForbiddenException`.
- Заменить `@Body() dto: any` на типизированный DTO (inline или отдельный class).
- Импортировать `UseGuards`, `ForbiddenException` из `@nestjs/common`, `JwtAdminGuard`, `CurrentUser`, `AuthUser` из `@/common/auth/jwt-user.guard`.

### 3.2 Guard на `SystemSettingsController`

- Добавить `@UseGuards(JwtAdminGuard)` **на уровне контроллера** (перед `@Controller`).
- Импортировать `UseGuards` из `@nestjs/common`, `JwtAdminGuard` из `@/common/auth/jwt-user.guard`.

### 3.3 Guard на `AnalyticsController`

- Добавить `@UseGuards(JwtAdminGuard)` **на уровне контроллера**.
- Импортировать `UseGuards` из `@nestjs/common`, `JwtAdminGuard` из `@/common/auth/jwt-user.guard`.

## Результат шага

- `POST /api/auth/register-admin` без admin JWT → `401`. С non-SUPER_ADMIN JWT → `403`.
- `GET /api/analytics/*` без JWT → `401`.
- `GET/POST /api/system-settings/*` без JWT → `401`.

## Статус

Не начато

## Журнал изменений

(будет заполнено при реализации)

## Файлы

- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/system-settings/system-settings.controller.ts`
- `backend/src/modules/analytics/analytics.controller.ts`

## Тестирование / Верификация

- `curl -X POST http://localhost:3000/api/auth/register-admin -H 'Content-Type: application/json' -d '{"email":"x@x.com","password":"12345678"}' → 401`
- `curl http://localhost:3000/api/analytics/dashboard` → `401`
- `curl http://localhost:3000/api/system-settings` → `401`
- `curl -H 'Authorization: Bearer <admin_jwt>' http://localhost:3000/api/analytics/dashboard` → `200`
- `npm run build` — без ошибок
