# Phase 9: API Security Infrastructure (Helmet, CORS, DTO, Rate Limiting)

> [Корневой документ wiki](../README.md)

## Цель

Устранить MEDIUM и LOW уязвимости из security audit 2026-05-08: добавить security headers, ограничить CORS, скрыть Swagger в production, создать DTO с валидацией, внедрить rate limiting.

## Результат

- Backend отдаёт security headers через `helmet` (X-Content-Type-Options, X-Frame-Options, HSTS, CSP).
- CORS настроен с явным списком разрешённых origins, без fallback на `*`.
- CORS origins покрывают admin, client/PWA/Mini App и локальные dev origins; список синхронизирован с `.env.example`.
- Swagger UI недоступен в production (`NODE_ENV=production`).
- `test-notify` endpoint закрыт `JwtAdminGuard`.
- Все write endpoints с внешним input используют типизированные DTO с `class-validator` вместо `@Body() dto: any`, включая admin mutations, auth, orders/payments user mutations и bot/internal payloads.
- Auth endpoints защищены rate limiting (5 login / 3 SMS в минуту).
- Webhooks (CloudPayments, Robokassa) исключены из throttle.
- Rate limiting учитывает reverse proxy/Railway deployment и не должен полагаться на ephemeral in-memory state как production-only control при нескольких инстансах.

## Оценка

~3-4 часа суммарно. Риск регрессий средний: изменения инфраструктурные, но DTO/CORS/rate-limit затрагивают client/admin/bot integration boundaries.

## Зависит от

- [phase-3-admin-auth-and-api-security.md](./phase-3-admin-auth-and-api-security.md) — guards и JWT hardening должны быть выполнены первыми.

## Пререквизиты

- Phase 3 полностью выполнена (guards + JWT hardening).
- Локально поднят backend.
- `npm run build` и `npm run test` проходят.
- Известны production CORS origins из `.env.example`.

## Архитектурные решения

- `helmet` используется как baseline security headers control. CSP нельзя включать вслепую: payment success/fail HTML содержит inline styles/scripts и внешние Telegram/CloudPayments scripts, поэтому CSP нужно либо настроить явно, либо отключить точечно до отдельного CSP hardening.
- CORS: `process.env.CORS_ORIGIN` должен содержать comma-separated список доменов. Fallback на localhost-only, а не на `*`.
- Swagger: полностью скрыт в production. Если нужен доступ — рассмотреть Basic Auth в следующей итерации.
- DTO: используем `class-validator` + `class-transformer`. Глобальный `ValidationPipe` с `whitelist: true` и `forbidNonWhitelisted: true` уже настроен, но с `any` DTO whitelist не работает.
- Rate limiting: `@nestjs/throttler` глобально с мягким лимитом (60 req/min), жёсткие лимиты на auth endpoints. Для production при горизонтальном scaling добавить Redis-backed store или явно зафиксировать single-instance ограничение.
- Proxy/IP: зафиксировать trusted proxy behavior, иначе лимиты могут считаться по Railway proxy IP или обходиться через headers.
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
- `POST /api/products/bulk/toggle-active` с неизвестными полями → `400`.
- `POST /api/payments/create` без `orderId` → `400`.
- `POST /api/orders` без `productId` → `400`.
- 6 x `POST /api/auth/login` за минуту → `429 Too Many Requests`.
- 4 x `POST /api/auth/phone/send-code` за минуту → `429 Too Many Requests`.
- Webhook `POST /api/payments/cloudpayments/pay` → не throttle-ится.
- Robokassa webhook `POST /api/payments/webhook` → не throttle-ится.
- `npm run build` — без ошибок.
- `npm run test` — все тесты green.

## Журнал

- **[2026-05-08]** Фаза создана по результатам security audit. Покрывает MEDIUM (4 находки) и LOW (3 находки) из аудита.
- **[2026-05-08]** После review плана scope расширен: DTO теперь покрывают все external write inputs, CORS учитывает client/admin origins, throttling учитывает proxy/distributed risks, Helmet CSP не включается вслепую для payment callback HTML.

## Ссылки

- [Корневой документ wiki](../README.md)
- [Phase 3: Admin Auth & API Security](./phase-3-admin-auth-and-api-security.md)
- [Security Audit Report](../../.agent/agents/security-auditor.md)
