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
- После реализации Phase 3 bot-only backend mutations нельзя вызывать из client/browser-кода: `POST /users/find-or-create` и `POST /referrals/register` теперь требуют `x-telegram-bot-token`, а user-facing профиль должен читаться через `/auth/me` или owner-guarded routes с user JWT.
- Admin JWT теперь живёт 8 часов и требует `type: 'admin'`; старые токены без `type` после деплоя будут отвергаться `JwtAdminGuard`, поэтому admin runtime должен уметь переживать принудительный re-login.
- Client redirect-параметры `returnTo` нельзя передавать напрямую в `router.push()` или `router.replace()`: все user-controlled значения должны проходить через `sanitizeRedirect()` из `client/lib/security.ts`. Sanitizer разрешает только same-origin relative URL, но сохраняет query/hash, потому что product/country/balance auto-buy flow использует вложенные внутренние `returnTo`.
- `client` intentionally не включает полный CSP в первом security hardening pass: активны только baseline headers и `frame-ancestors`, потому что Telegram Mini App и CloudPayments требуют отдельной runtime-проверки для `script-src`, `connect-src` и `frame-src`.
- URL hash с `tgWebAppData`/`tgWebAppVersion` в client считается только launch hint для ожидания Telegram SDK. Доверенная Telegram WebApp авторизация возможна только при наличии подписанного `window.Telegram.WebApp.initData` и backend-проверки `/auth/telegram/webapp`.

## Data and migrations

- `backend` больше не должен использовать `db push` как основную production стратегию; baseline migration добавлен, новые schema changes нужно вести через migrations.
- `backend/prisma/seed.ts` создаёт продукты без `upsert`, поэтому повторный запуск может раздувать каталог дубликатами.
- исторически проект жил без `prisma/migrations`; после добавления baseline migration существующие БД нужно baseline/apply'ить осознанно, а не смешивать с ручными `db push`.

## Product behavior

- `pnpm dev` не запускает `client`; для полного локального контура нужен отдельный запуск пользовательского фронта.
- `client/app/layout.tsx` намеренно выполняет Telegram/PWA scripts до hydration и может мутировать DOM (`html/body`, CSS variables, service worker state) раньше React. В локальном `next dev` это способно давать hydration warnings даже при нормальном production-поведении; для такого layout нужен `suppressHydrationWarning` на корневой boundary.
- Глобальный `suppressHydrationWarning` в `client/app/layout.tsx` пока остаётся intentional temporary guard, а не нормой: он прикрывает ранние DOM mutations от Telegram/PWA bootstrap и browser-only auth restore. Сужать его область безопасно только после локализации hydration-sensitive routes и root-level script side effects.
- `client/app/layout.tsx` остаётся Server Component, потому что экспортирует `metadata` и `viewport`. Client-only поведение для Telegram SDK нужно выносить в отдельный компонент с `next/script onLoad`, а не добавлять `'use client'` в root layout.
- Inline scripts в root layout нежелательны для будущего CSP. PWA install prompt и SW reset вынесены в `client/public/pwa-prompt.js` и `client/public/sw-reset.js`; при изменении SW reset нужно сохранять session guard, чтобы не получить reload loop.
- В текущем `client` связка `next@14.2.x` + `react 18.3.x` + `lucide-react@0.563.x` может давать разный SSR/CSR SVG output (`className`, `aria-hidden`, `path d`) и валить hydration после reload. На пользовательском фронте безопаснее импортировать иконки через локальный client-only shim, а не напрямую из `lucide-react`.
- `admin` navigation показывает вкладки `payments` и `analytics`, но в UI это пока заглушки.
- catalog sync split-brain: legacy `EsimProviderService.syncProducts()` не пишет в БД, но реальный admin route использует `ProductsService.syncWithProvider()`, который уже делает upsert. При работе с roadmap нельзя путать эти два контура.
- Purchase completion boundary для loyalty/referral живёт в `OrdersService.fulfillOrder()`: card webhook, balance purchase и free-order flow сходятся в одну точку, а top-up намеренно исключён через `fulfillTopupOrder()`. При изменении referral/loyalty логики нельзя дублировать side effects в payment handlers.
- Loyalty discount действует на текущую покупку по текущему уровню, а `LoyaltyService.updateUserLevel()` вызывается только после роста `totalSpent`. Новый уровень влияет только на следующую покупку, не на уже завершённую.
- `client` build исторически ломался из-за отсутствующих SWC optional deps и build-time загрузки Google Fonts; после фикса package manifests и удаления `next/font/google` зависимость от внешнего fetch убрана.
- `client/app/profile/page.tsx` остаётся browser/auth-bound экраном с `localStorage`, `document`, `window.matchMedia`, share APIs и redirect side effects. Для такого route безопаснее держать `export const dynamic = 'force-dynamic'`, чем полагаться на static prerender в App Router.
- Payment/provider troubleshooting больше нельзя строить на raw production payload dumps по умолчанию. Для `Robokassa` и `eSIM Access` baseline должен опираться на masked correlation ids (`orderId`, `InvId`, ICCID/orderNo tail), success/error flags и explicit `DEBUG_SENSITIVE_LOGS=true` только для targeted debugging.
- Phase 10 reconciliation baseline пока intentionally derived, а не persisted: admin/support должны искать partial failures через `GET /orders?reconciliation=needs_attention` и поле `order.reconciliation`, которое вычисляется из `FAILED` order + successful `PAYMENT` tx + refund presence. Это triage signal, а не гарантия автоматического retry/refund orchestration.
- Исторические документы и старые клиентские компоненты могут ссылаться на `GET /referrals/stats/:userId` как на user-facing route, но актуальный контракт другой: клиент должен ходить в `GET /referrals/me`, а `stats/:userId` и `top` теперь только admin/internal.
- `POST /referrals/register` больше нельзя считать публичным mutation endpoint: bot flow требует `x-telegram-bot-token`, а сервис дополнительно сверяет `telegramId` пользователя перед привязкой.
- После перевода `client` helper `userApi.getMe()` на `/auth/me` любые Telegram-specific клиентские эффекты должны сначала проверять наличие user JWT в storage. Иначе они будут шуметь `401 /auth/me` на cold start без авторизации.
- `TelegramRedirectHandler` больше нельзя координировать blind `setTimeout(1000)`: redirect/new-order checks должны ждать явного завершения auth bootstrap из `AuthProvider` и readiness signal от `TelegramSdkScript`, иначе Mini App cold start остаётся зависимым от скорости SDK и сети.
- В card order flow бонусы теперь резервируются через `BONUS_SPENT/PENDING` hold. Любое изменение purchase/payment lifecycle должно учитывать finalize, release и cleanup протухших hold-ов, иначе referral/cashback availability снова разъедется.
- `admin` build проходит, но сохраняются warning'и по `@typescript-eslint/no-unused-vars` и замечание про отсутствие Next ESLint plugin integration.
