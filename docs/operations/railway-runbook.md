# Railway Runbook

> [Корневой документ wiki](../README.md)

Практический порядок действий для production-деплоя, учитывая что `main` в GitHub подключён к Railway autodeploy.

Подробный контекст по Prisma baseline: [../architecture/railway-production-baseline.md](../architecture/railway-production-baseline.md)

## Ключевое правило

Любой merge или push в `main` может сразу запустить Railway deploy.

Если изменение затрагивает backend startup, Prisma migrations, env surface, payment callbacks или Telegram URLs, его нельзя считать обычным "кодовым" merge. Сначала нужно проверить production readiness, потом пускать автодеплой.

## Перед merge в `main`

Проверить:

- production backup PostgreSQL существует и его можно восстановить
- Railway services понятны: `backend`, `admin`, `bot`, PostgreSQL, Redis
- `client` deployment: это отдельный сервис в Railway, он должен иметь Root Directory `/client`
- production env заполнены и не требуют новых ключей из этого merge
- `DATABASE_URL` у backend указывает на нужную production БД
- `CORS_ORIGIN`, `BACKEND_URL`, `FRONTEND_URL`, `MINI_APP_URL`, `SITE_URL` соответствуют production доменам
- Telegram bot token и Mini App URL соответствуют production боту
- CloudPayments webhook URL указывает на production backend
- ESIMAccess credentials валидны

## Если merge содержит Prisma baseline `20260507_init`

Для уже существующей production БД сначала выполнить baseline, потом push в `main`.

Команды выполняются в окружении, где `DATABASE_URL` указывает на production PostgreSQL:

```bash
npx prisma migrate status --schema backend/prisma/schema.prisma
npx prisma migrate resolve --applied 20260507_init --schema backend/prisma/schema.prisma
npx prisma migrate status --schema backend/prisma/schema.prisma
```

Ожидаемый финальный статус:

```text
Database schema is up to date!
```

После этого можно делать merge/push в `main`. Railway autodeploy поднимет backend через `prisma migrate deploy`.

## Если это новая пустая БД

Для новой БД baseline через `resolve` не нужен.

Обычный порядок:

```bash
npx prisma migrate deploy --schema backend/prisma/schema.prisma
npm run prisma:seed --workspace backend
```

Seed на production запускать только осознанно: текущий seed создаёт тестовый admin, loyalty levels, products и settings. Повторный запуск может создать дубликаты products.

## После Railway autodeploy

Проверить в Railway:

- backend build завершился успешно
- backend startup logs не содержат Prisma errors
- `prisma migrate deploy` не пытается применить `20260507_init` поверх непустой БД
- admin service стартует
- bot service стартует

Smoke-check:

```bash
curl https://<backend-domain>/api/docs
curl https://<backend-domain>/api/products
```

Затем вручную проверить:

- client/PWA читает каталог с production backend
- admin открывается и видит данные backend
- Telegram bot отвечает на базовую команду
- CloudPayments webhook endpoint доступен

## Когда останавливать rollout

Остановиться и не делать следующий merge/push, если:

- `migrate status` показывает drift или неожиданные pending migrations
- production БД не совпадает с текущим `backend/prisma/schema.prisma`
- Railway backend падает до Nest startup
- payment или Telegram env отличаются от ожидаемых production значений
- CloudPayments/Telegram callback URLs ещё не обновлены под production domain

## Rollback

Если после autodeploy backend не стартует:

1. Снять точный текст ошибки из Railway logs.
2. Откатить Railway deployment на предыдущую рабочую версию, если schema-changing migration не применялась.
3. Не запускать `migrate reset` на production.
4. Не запускать `db push --accept-data-loss` на production.
5. Использовать backup только после понимания, какие schema/data изменения реально произошли.

## Что нельзя делать

- Не пушить Prisma startup changes в `main`, если existing production DB ещё не baseline-нута.
- Не запускать `prisma migrate reset` на production.
- Не возвращать `prisma db push --accept-data-loss` как production startup command.
- Не запускать seed повторно на production без проверки, что он идемпотентен для нужных таблиц.
