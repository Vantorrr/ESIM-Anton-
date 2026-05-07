# Railway Production Baseline

> [Корневой документ wiki](../README.md) 
> [Архитектура](../README.md)
> [Railway Runbook](../operations/railway-runbook.md)

## Зачем нужен этот документ

Этот чеклист нужен для случая, когда:

- проект уже работает на Railway;
- production PostgreSQL уже существует и не пустая;
- репозиторий переведён на baseline migration `20260507_init`;
- нужно перейти от исторического `db push`-style flow к `Prisma Migrate` без поломки production.

## Важный принцип

Для уже существующей production БД `20260507_init` нельзя воспринимать как новую миграцию, которую надо "применить".

Это baseline уже существующей схемы.

Значит для production нужен порядок:

1. backup
2. schema verification
3. `migrate resolve --applied`
4. `migrate status`
5. только потом переключение runtime на `migrate deploy`

## Что проверить до любых действий

Отдельно учитывать operational constraint:

- GitHub `main` у проекта привязан к Railway autodeploy
- значит любой merge/push в production-ветку почти сразу запускает новый backend startup flow
- следовательно baseline existing DB нельзя совмещать с "сначала запушим, а потом руками разберёмся"

### 1. Репозиторий

Убедиться, что в деплойной ветке уже есть:

- [backend/prisma/migrations/20260507_init/migration.sql](../../backend/prisma/migrations/20260507_init/migration.sql)
- [backend/prisma/migration_lock.toml](../../backend/prisma/migration_lock.toml)
- обновлённый [backend/package.json](../../backend/package.json) со `start`/`start:prod` через `prisma migrate deploy`

### 2. Railway services

Нужно понимать, какие сервисы реально живут в Railway:

- backend
- admin
- bot
- PostgreSQL

`client` по legacy-brief развёртывается отдельно на Рег.ру как PWA. Если в Railway есть отдельный `client` service, это нужно подтвердить в Railway UI, а не выводить только из структуры репозитория.

### 3. Environment

Проверить production env:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `BACKEND_URL`
- `FRONTEND_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `ESIMACCESS_ACCESS_CODE`
- `ESIMACCESS_SECRET_KEY`
- `CLOUDPAYMENTS_*`, если карточные платежи должны работать

## Безопасный production plan

### Шаг 1. Сделать backup PostgreSQL

До любых migration-операций нужен backup production БД.

Если backup не сделан, дальше идти нельзя.

### Шаг 2. Проверить текущий статус Prisma

Запустить в backend окружении:

```bash
npx prisma migrate status --schema backend/prisma/schema.prisma
```

Ожидаемо на старой production БД до baseline будет что-то вроде:

- БД не пуста
- migration `20260507_init` ещё не отмечена как applied

### Шаг 3. Baseline-нуть существующую production БД

Для уже существующей схемы выполнить:

```bash
npx prisma migrate resolve --applied 20260507_init --schema backend/prisma/schema.prisma
```

Что делает команда:

- не меняет таблицы;
- не дропает данные;
- только помечает baseline migration как уже применённую для этой БД.

### Шаг 4. Снова проверить статус

```bash
npx prisma migrate status --schema backend/prisma/schema.prisma
```

Ожидаемый результат:

- `Database schema is up to date`

Если этого не произошло, не переключать runtime на новый flow.

### Шаг 5. Только теперь переключать runtime

После успешного baseline можно переходить на startup c:

```bash
prisma migrate deploy && node dist/main
```

Именно это теперь уже зафиксировано в [backend/package.json](../../backend/package.json).

### Шаг 6. Прогнать smoke-check после деплоя

Проверить:

1. backend стартует без Prisma errors
2. `/api/docs` отвечает
3. `/api/products` отвечает
4. client может читать каталог
5. admin открывается
6. bot не падает на startup

## Что нельзя делать

- нельзя запускать `prisma migrate deploy` на старой production БД до `resolve --applied`
- нельзя делать `prisma migrate reset` на production
- нельзя возвращаться к `db push --accept-data-loss` как к основному production flow
- нельзя baseline-нуть БД без backup

## Когда нужно остановиться

Нужно остановиться и отдельно разбираться, если:

- `migrate status` показывает неожиданные расхождения со schema
- продовая БД явно не соответствует текущему `schema.prisma`
- кто-то раньше вручную менял таблицы, индексы или enums вне Prisma schema

В этом случае baseline всё ещё возможен, но уже не как механическая операция.

## Railway checklist

### Вариант A. Самый безопасный

1. Не пускать в `main` коммит, который сразу переведёт production на новый startup flow без baseline.
2. Одноразово выполнить `migrate resolve --applied 20260507_init` на существующей production БД.
3. Проверить `migrate status`.
4. Только потом делать merge/push в `main`, после которого Railway autodeploy поднимет backend уже через `migrate deploy`.

### Вариант B. Если есть staging

1. Поднять staging service с копией production schema.
2. Повторить весь baseline flow там.
3. Только после успешной staging-проверки повторить то же в production.

### Вариант C. Если autodeploy нельзя отключить, а baseline надо сделать срочно

1. Не пушить backend-изменения с новым startup flow в `main`.
2. Сначала выполнить baseline на текущей production БД вручную.
3. Сразу после успешного `migrate status` сделать контролируемый push в `main`.
4. После автодеплоя проверить startup logs Railway и сделать smoke-check.

## Rollback mindset

Если после переключения на новый deploy flow backend не стартует:

1. не запускать дополнительные schema-changing команды наугад;
2. снять точный текст Prisma/Nest ошибки;
3. при необходимости откатить кодовую версию;
4. использовать backup как крайний вариант, а не первый шаг.

## Итог

Для Railway migration baseline безопасен, если помнить простое правило:

- существующую БД не мигрируют `init`-миграцией;
- её сначала baseline-ят через `migrate resolve --applied`;
- только потом используют `migrate deploy` как нормальный runtime flow.
