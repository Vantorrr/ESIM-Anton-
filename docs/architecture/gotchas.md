# Gotchas

> [Корневой документ wiki](../README.md)

## Documentation

- `docs/architecture/README.md` до этой ревизии ссылался на несуществующие `gotchas.md` и `guidelines.md`.
- Корневая документация описывает разные эпохи проекта и часто конфликтует сама с собой.

## Config

- `.env.example` теперь есть, но его нужно считать живым контрактом и обновлять вместе с кодом.
- Нельзя слепо переносить env keys из старых markdown-файлов: часть названий исторически не соответствовала текущему коду.

## Security

- Исторический `ESIMACCESS_INTEGRATION.md` содержал чувствительные доступы внутри репозитория. Это следует считать инцидентом конфигурационной безопасности; актуальный очищенный документ теперь лежит в [../integrations/esim-access.md](../integrations/esim-access.md).
- Admin frontend сейчас защищён browser-side PIN-кодом, а не полноценной серверной авторизацией.
- Часть admin write endpoints на backend не закрыта `JwtAdminGuard`; подробности в [codebase-audit.md](./codebase-audit.md).

## Data and migrations

- `backend` больше не должен использовать `db push` как основную production стратегию; baseline migration добавлен, новые schema changes нужно вести через migrations.
- `backend/prisma/seed.ts` создаёт продукты без `upsert`, поэтому повторный запуск может раздувать каталог дубликатами.
- исторически проект жил без `prisma/migrations`; после добавления baseline migration существующие БД нужно baseline/apply'ить осознанно, а не смешивать с ручными `db push`.

## Product behavior

- `pnpm dev` не запускает `client`; для полного локального контура нужен отдельный запуск пользовательского фронта.
- `admin` navigation показывает вкладки `payments` и `analytics`, но в UI это пока заглушки.
- `EsimProviderService.syncProducts()` не синхронизирует БД, несмотря на название и ожидания старой документации.
- Реферальные настройки и loyalty logic сейчас требуют wiring-аудита: UI/сервисы есть, но начисление бонуса и пересчёт уровня не подтверждены как подключённые к successful purchase flow.
- `client` build исторически ломался из-за отсутствующих SWC optional deps и build-time загрузки Google Fonts; после фикса package manifests и удаления `next/font/google` зависимость от внешнего fetch убрана.
- В Phase 2 найдены и исправлены frontend/backend route mismatches: client referral stats должен ходить в `/referrals/stats/:userId`, а история транзакций баланса — в `/payments/user/:userId`.
- `admin` build проходит, но сохраняются warning'и по `@typescript-eslint/no-unused-vars` и замечание про отсутствие Next ESLint plugin integration.
