# Phase 3: Admin Auth & API Security Hardening

> [Корневой документ wiki](../README.md)

## Цель

Закрыть backend API как реальную границу доступа для admin operations. Устранить все CRITICAL и HIGH уязвимости, обнаруженные в security audit от 2026-05-08.

## Результат

- Все admin write endpoints защищены `JwtAdminGuard`.
- Все admin read endpoints (analytics, users list, payments, orders) защищены `JwtAdminGuard`.
- Публичные client-facing endpoints (каталог, страны, OAuth) остаются открытыми.
- `POST /auth/register-admin` требует `SUPER_ADMIN` токен.
- JWT модель усилена: admin payload содержит `type: 'admin'`, guard проверяет whitelist ролей.
- Admin JWT TTL сокращён до 8 часов.
- Ручной парсинг JWT в `updateMyEmail` заменён на guard.
- Прямой неавторизованный вызов любого admin endpoint возвращает `401`.

## Оценка

~3-4 часа суммарно по всем шагам.
Высокий приоритет — без этого production API позволяет создавать admin-аккаунты, менять цены и читать PII без аутентификации.

## Зависит от

- [phase-2-runtime-verification.md](./phase-2-runtime-verification.md) — подтверждён рабочий контур
- [Security Audit от 2026-05-08](../../.agent/agents/security-auditor.md) — findings

## Пререквизиты

- Локально поднят backend и admin.
- `POST /api/auth/login` работает, возвращает admin JWT.
- `admin/lib/api.ts` уже отправляет `Bearer` из `localStorage`.
- `admin/app/page.tsx` уже имеет login form и сохраняет `access_token` в localStorage.
- `SharedAuthModule` глобально экспортирует `JwtAdminGuard` и `JwtUserGuard`.

## Архитектурные решения

- Admin login UI и token propagation уже реализованы ранее. Шаги 2-3 из предыдущей версии Phase 3 подтверждены как выполненные.
- Защита endpoints — атомарная операция: добавляем `@UseGuards(JwtAdminGuard)` — admin UI уже отправляет Bearer.
- `GET /products`, `GET /products/countries`, `GET /products/:id` — остаются публичными (клиентский каталог).
- `POST /users/find-or-create` — используется ботом. Временно защищается `JwtAdminGuard`, пока не будет реализован inter-service API key.
- `GET /orders/:id` и `GET /orders/user/:userId` — используются и из admin, и из client. На этом этапе ставим `JwtAdminGuard`. Если client-facing route нужен — это отдельная задача вне Phase 3.
- Обязательно: `type: 'admin'` в JWT payload + whitelist ролей в guard, чтобы user-токен не проходил admin guard.

## Шаги (журналы)

- [Шаг 1. Зафиксировать текущую auth-карту (обновлённый аудит)](./phase-3/step-1-auth.md)
- [Шаг 2. Подтвердить работоспособность admin login flow](./phase-3/step-2-admin-login-ui.md)
- [Шаг 3. Закрыть CRITICAL endpoints guard'ами](./phase-3/step-3-critical-guards.md)
- [Шаг 4. Закрыть HIGH endpoints guard'ами + исправить IDOR](./phase-3/step-4-high-guards-and-idor.md)
- [Шаг 5. Усилить JWT модель (type, roles, TTL)](./phase-3/step-5-jwt-hardening.md)
- [Шаг 6. Провести security smoke](./phase-3/step-6-security-smoke.md)

## Верификация

- `POST /api/auth/register-admin` без токена → `401`.
- `POST /api/auth/register-admin` с `SUPPORT` токеном → `403`.
- `GET /api/analytics/dashboard` без токена → `401`.
- `POST /api/system-settings/pricing` без токена → `401`.
- `GET /api/users` без токена → `401`.
- `GET /api/products` без токена → `200` (публичный каталог).
- `POST /api/products/sync` без токена → `401`.
- Admin UI login → dashboard загружается → все вкладки работают.
- `npm run build` — без ошибок.
- `npm run test` — все тесты green.

## Журнал

- **[2026-05-07] Аудит текущего состояния:**
  - Шаг 1 выполнен (первичный аудит).
  - Admin UI использовал frontend-only PIN — обнаружено, что уже переведён на backend login flow.
  - `admin/lib/api.ts` уже отправляет `Bearer` из localStorage, `page.tsx` уже реализует login form.

- **[2026-05-08] Полный security audit:**
  - Проведён полный аудит по OWASP Top 10:2025 методологии.
  - Обнаружено 3 CRITICAL, 5 HIGH, 4 MEDIUM, 3 LOW уязвимостей.
  - Phase 3 переписана с учётом findings и обновлённого состояния кода.
  - Шаги 2-3 из предыдущей версии подтверждены как выполненные (login UI + token propagation уже работают).
  - Новая декомпозиция: 6 шагов с фокусом на guards, JWT hardening и smoke.

## Ссылки

- [Корневой документ wiki](../README.md)
- [Architecture module map](../architecture/module-map.md)
- [Codebase audit](../architecture/codebase-audit.md)
