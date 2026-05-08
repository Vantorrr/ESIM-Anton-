# Phase 9: API Security Infrastructure (Helmet, CORS, DTO, Rate Limiting)

> [Корневой документ wiki](../README.md)

## Цель

Устранить MEDIUM и LOW уязвимости из security audit 2026-05-08: добавить security headers, ограничить CORS, скрыть Swagger в production, создать DTO с валидацией, внедрить rate limiting.

## Результат

- Backend отдаёт security headers через `helmet` (X-Content-Type-Options, X-Frame-Options, HSTS, CSP).
- CORS настроен с явным списком разрешённых origins, без fallback на `*`.
- Swagger UI недоступен в production (`NODE_ENV=production`).
- `test-notify` endpoint закрыт `JwtAdminGuard`.
- Все admin write endpoints используют типизированные DTO с `class-validator` вместо `@Body() dto: any`.
- Auth endpoints защищены rate limiting (5 login / 3 SMS в минуту).
- Webhooks (CloudPayments, Robokassa) исключены из throttle.

## Оценка

~2-2.5 часа суммарно. Низкий риск регрессий — изменения инфраструктурные, не затрагивают бизнес-логику.

## Зависит от

- [phase-3-admin-auth-and-api-security.md](./phase-3-admin-auth-and-api-security.md) — guards и JWT hardening должны быть выполнены первыми.

## Пререквизиты

- Phase 3 полностью выполнена (guards + JWT hardening).
- Локально поднят backend.
- `npm run build` и `npm run test` проходят.
- Известны production CORS origins из `.env.example`.

## Архитектурные решения

- `helmet` используется с дефолтными настройками — они покрывают OWASP security headers рекомендации.
- CORS: `process.env.CORS_ORIGIN` должен содержать comma-separated список доменов. Fallback на localhost-only, а не на `*`.
- Swagger: полностью скрыт в production. Если нужен доступ — рассмотреть Basic Auth в следующей итерации.
- DTO: используем `class-validator` + `class-transformer`. Глобальный `ValidationPipe` с `whitelist: true` уже настроен, но с `any` DTO whitelist не работает.
- Rate limiting: `@nestjs/throttler` глобально с мягким лимитом (60 req/min), жёсткие лимиты на auth endpoints.
- Webhooks: `@SkipThrottle()` — внешние платёжные системы не должны throttle-иться.

## Шаги (журналы)

- [Шаг 1. Security headers и CORS](./phase-9/step-1-helmet-cors.md)
- [Шаг 2. Swagger и test-notify](./phase-9/step-2-swagger-test-notify.md)
- [Шаг 3. DTO с class-validator для admin endpoints](./phase-9/step-3-dto-validation.md)
- [Шаг 4. Rate limiting](./phase-9/step-4-rate-limiting.md)

## Верификация

- `curl -I http://localhost:3000/api/products` → заголовки `X-Content-Type-Options`, `X-Frame-Options` присутствуют.
- `NODE_ENV=production` → `GET /api/docs` → `404`.
- `POST /api/auth/register-admin` с `@Body() { email: 123 }` → `400` с описанием ошибки валидации.
- 6 x `POST /api/auth/login` за минуту → `429 Too Many Requests`.
- Webhook `POST /api/payments/cloudpayments/pay` → не throttle-ится.
- `npm run build` — без ошибок.
- `npm run test` — все тесты green.

## Журнал

- **[2026-05-08]** Фаза создана по результатам security audit. Покрывает MEDIUM (4 находки) и LOW (3 находки) из аудита.

## Ссылки

- [Корневой документ wiki](../README.md)
- [Phase 3: Admin Auth & API Security](./phase-3-admin-auth-and-api-security.md)
- [Security Audit Report](../../.agent/agents/security-auditor.md)
