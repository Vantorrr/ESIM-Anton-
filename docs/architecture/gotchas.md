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
- `client/app/layout.tsx` намеренно выполняет Telegram/PWA scripts до hydration и может мутировать DOM (`html/body`, CSS variables, service worker state) раньше React. В локальном `next dev` это способно давать hydration warnings даже при нормальном production-поведении; для такого layout нужен `suppressHydrationWarning` на корневой boundary.
- В текущем `client` связка `next@14.2.x` + `react 18.3.x` + `lucide-react@0.563.x` может давать разный SSR/CSR SVG output (`className`, `aria-hidden`, `path d`) и валить hydration после reload. На пользовательском фронте безопаснее импортировать иконки через локальный client-only shim, а не напрямую из `lucide-react`.
- `admin` navigation показывает вкладки `payments` и `analytics`, но в UI это пока заглушки.
- catalog sync split-brain: legacy `EsimProviderService.syncProducts()` не пишет в БД, но реальный admin route использует `ProductsService.syncWithProvider()`, который уже делает upsert. При работе с roadmap нельзя путать эти два контура.
- Purchase completion boundary для loyalty/referral живёт в `OrdersService.fulfillOrder()`: card webhook, balance purchase и free-order flow сходятся в одну точку, а top-up намеренно исключён через `fulfillTopupOrder()`. При изменении referral/loyalty логики нельзя дублировать side effects в payment handlers.
- Loyalty discount действует на текущую покупку по текущему уровню, а `LoyaltyService.updateUserLevel()` вызывается только после роста `totalSpent`. Новый уровень влияет только на следующую покупку, не на уже завершённую.
- `client` build исторически ломался из-за отсутствующих SWC optional deps и build-time загрузки Google Fonts; после фикса package manifests и удаления `next/font/google` зависимость от внешнего fetch убрана.
- Исторические документы и старые клиентские компоненты могут ссылаться на `GET /referrals/stats/:userId` как на user-facing route, но актуальный контракт другой: клиент должен ходить в `GET /referrals/me`, а `stats/:userId` и `top` теперь только admin/internal.
- `POST /referrals/register` больше нельзя считать публичным mutation endpoint: bot flow требует `x-telegram-bot-token`, а сервис дополнительно сверяет `telegramId` пользователя перед привязкой.
- В card order flow бонусы теперь резервируются через `BONUS_SPENT/PENDING` hold. Любое изменение purchase/payment lifecycle должно учитывать finalize, release и cleanup протухших hold-ов, иначе referral/cashback availability снова разъедется.
- `admin` build проходит, но сохраняются warning'и по `@typescript-eslint/no-unused-vars` и замечание про отсутствие Next ESLint plugin integration.
