# Runtime And Operations

> [Корневой документ wiki](../README.md)

## Workspace and ports

Root `package.json` подтверждает следующие dev entrypoints:

- `pnpm dev` — запускает `backend`, `admin`, `bot`
- `client` в общий `dev` script не включен и поднимается отдельно

Ожидаемые порты по коду:

- backend: `3000`
- admin: `3001`
- client: `3002`

## Infrastructure

`docker-compose.yml` поднимает:

- PostgreSQL 16 (`esim-postgres`)
- Redis 7 (`esim-redis`)

Production topology по проверенным документам и коду выглядит так:

- `backend`, `admin` и `bot` живут на Railway
- production PostgreSQL и Redis тоже ожидаются на Railway
- `client` описан как отдельный веб-фронт и в legacy-brief развёртывается вне Railway
- push в `main` GitHub запускает Railway autodeploy, поэтому backend-изменения нельзя рассматривать как "просто смержим и потом вручную доделаем на проде"

## Seeds and bootstrap

Файл `backend/prisma/seed.ts` делает следующее:

- создаёт `SUPER_ADMIN` с `admin@esim-service.com`
- создаёт 5 loyalty levels
- создаёт 18 seed products
- создаёт базовые `system_settings`

Важно:

- сид не использует `upsert` для продуктов, только `create`
- повторный запуск seed вероятно приведёт к дубликатам товаров

## Auth runtime

Фактические пользовательские способы входа:

- phone OTP
- Google OAuth
- Yandex OAuth
- VK OAuth
- Telegram Login Widget
- Telegram WebApp init data

Отдельно существует admin login endpoint, но `admin` frontend сейчас его не использует и защищён PIN-кодом в браузере.

## Payments runtime

Проект находится в переходном состоянии:

- CloudPayments — активный современный поток для top-up личного баланса и подключенный webhook-контроллер
- Robokassa — старый поток для заказа и fallback balance top-up, код всё ещё живой

Следствие:

- старую документацию про "один платёжный провайдер" нельзя считать точной
- для production нужно явно выбрать основной платёжный контур и убрать двусмысленность

## eSIM runtime

По коду `EsimProviderService`:

- основной рабочий путь — `EsimAccessProvider`
- legacy-код под eSIM Go/fallback всё ещё существует
- `syncProducts()` в provider service пока не обновляет БД реально, а только возвращает счётчик пакетов

## Cron jobs and background behavior

Подтвержденные фоновые задачи:

- ежедневное автообновление курса USD/RUB (`SystemSettingsService`)
- hourly traffic monitor для низкого остатка (`TrafficMonitorService`)

## Operational gaps

- `.env.example` восстановлен, но его нужно поддерживать синхронно с кодом при каждом изменении env surface
- backend `start` и `start:prod` переведены на `prisma migrate deploy`
- client и admin используют разные major-версии Next/React
- часть корневых документов переведена в archival mode; старые инженерные утверждения нужно брать из wiki, а не из исторических summary/checklist файлов
- в Phase 2 подтверждено, что `backend`, `bot`, `admin` и `client` собираются; для `admin/client` потребовалась стабилизация workspace-зависимостей и запуск build вне sandbox
- в Phase 2 подтверждено, что backend HTTP smoke routes, admin `/`, client `/`, `/referrals`, `/balance` локально отвечают `200`
- в Phase 2 исправлены client/backend route mismatches для referral stats и balance transaction history
- в Phase 2 добавлен baseline migration в `backend/prisma/migrations`, но существующие уже поднятые БД всё ещё нужно аккуратно baseline/apply'ить
- из-за Railway autodeploy по push в `main` любые изменения backend startup flow требуют отдельного rollout-плана, а не обычного merge-to-prod
- bot runtime напрямую не запускался в verification-сессии, потому что `bot/src/config.ts` загружает корневой `.env`; проверен backend contract, который bot использует
