# Phase 3: Admin Auth & API Security Hardening

> [Корневой документ wiki](../README.md)

## Цель

Сделать backend, а не browser-side PIN, реальной границей доступа для admin write operations.

## Результат

- admin UI получает backend admin JWT через подтверждённый login flow;
- admin API client отправляет `Authorization: Bearer ...`;
- write/admin endpoints закрыты `JwtAdminGuard`;
- read endpoints, которыми пользуются `dashboard`, `orders`, `users` и `products`, имеют явную auth policy, а не случайно публичное поведение;
- прямой неавторизованный вызов write endpoint возвращает `401/403`;
- browser-side PIN, если остаётся, считается только дополнительным UX-барьером, а не security boundary.

## Оценка

Высокий приоритет и высокий риск регрессий: текущая админка может работать за счёт отсутствия серверной защиты на части endpoints.

## Зависит от

- [phase-2-runtime-verification.md](./phase-2-runtime-verification.md)
- [../architecture/codebase-audit.md](../architecture/codebase-audit.md)

## Пререквизиты

- локально поднят backend и admin;
- известен текущий admin credential source из `.env.example`, без чтения боевого `.env`;
- подтверждены текущие admin routes через Swagger или smoke-запросы;
- зафиксировано, что `admin/lib/api.ts` уже умеет слать `Bearer` из `localStorage`, но текущий UI не получает admin token;
- подтверждено, что `POST /api/auth/login` существует и возвращает admin JWT.

## Архитектурные решения

- Серверная авторизация должна быть обязательной для write operations.
- CORS и PIN в браузере не считаются защитой API.
- Сначала внедряется admin login/token propagation, только потом массово включаются guards, чтобы не сломать admin UI вслепую.
- Нужно разделить user JWT и admin JWT usage: `/auth/me` сейчас валидирует только `payload.type === 'user'`, поэтому для admin session понадобится отдельный backend contract (`/auth/admin/me` или эквивалентная проверка).
- Для rollout важнее сначала закрыть write routes, но Phase 3 должна также явно решить судьбу публичных admin read routes, которыми сейчас питается dashboard.

## Шаги (журналы)

- [Шаг 1. Зафиксировать текущую auth-карту](./phase-3/step-1-auth.md)
- [Шаг 2. Внедрить admin login в UI](./phase-3/step-2-admin-login-ui.md)
- [Шаг 3. Подключить token к admin API client](./phase-3/step-3-token-admin-api-client.md)
- [Шаг 4. Закрыть write endpoints guard'ами](./phase-3/step-4-write-endpoints-guard.md)
- [Шаг 5. Провести security smoke](./phase-3/step-5-security-smoke.md)

## Верификация

- `POST/PUT/DELETE` admin endpoint без token возвращает `401/403`.
- Тот же endpoint с валидным admin token выполняется успешно.
- Admin UI после refresh сохраняет или корректно восстанавливает auth-состояние.
- Browser-side PIN не является единственным условием выполнения write-запроса.


## Журнал

- **[2026-05-07] Аудит текущего состояния:**
  - `Шаг 1` выполнен. 
  - Admin UI использует исключительно frontend-only PIN, сохраняемый в localStorage, и не делает реальной авторизации в API (нет JWT).
  - `admin/lib/api.ts` уже пытается брать `auth_token` из `localStorage`, но текущий `admin/app/page.tsx` не создаёт этот token и вообще не использует backend login flow.
  - `POST /api/auth/login` уже существует, но текущая фаза должна уточнить его response contract, admin payload и session recovery strategy для UI.
  - Большинство admin write-эндпоинтов на backend не имеют реальной защиты и ограничены только `@ApiBearerAuth()`. Подтверждённое исключение в текущем коде: `POST /products/dedupe` уже закрыт `JwtAdminGuard`.
  - Дополнительный открытый вопрос фазы: часть read routes (`analytics`, `orders`, `users`, `products`) сейчас используются админкой как публичные. Перед массовым включением guard'ов их нужно классифицировать как `admin-only` или намеренно публичные.
  - Шаги 2-5 не начаты. При внедрении `JwtAdminGuard` необходимо синхронно менять backend contract, admin login UI и проверку session restore.


## Ссылки на ранее созданные фазы и шаги, которые нужно учитывать при разработке этой фазы и ссылка назад на главный файл фазы из каждого шага.

- [Корневой документ wiki](../README.md)
