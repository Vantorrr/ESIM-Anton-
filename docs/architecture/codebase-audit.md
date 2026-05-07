# Codebase Audit

> [Корневой документ wiki](../README.md)

Дата аудита: 2026-05-07.

Этот документ фиксирует найденные риски по коду и документации после Phase 2 runtime smoke verification.

## Findings

### High. Admin write endpoints mostly rely on browser-side PIN

Файлы:

- [admin/app/page.tsx](../../admin/app/page.tsx)
- [backend/src/modules/products/products.controller.ts](../../backend/src/modules/products/products.controller.ts)
- [backend/src/modules/system-settings/system-settings.controller.ts](../../backend/src/modules/system-settings/system-settings.controller.ts)
- [backend/src/modules/loyalty/loyalty.controller.ts](../../backend/src/modules/loyalty/loyalty.controller.ts)
- [backend/src/modules/promo-codes/promo-codes.controller.ts](../../backend/src/modules/promo-codes/promo-codes.controller.ts)

Проблема:

- admin UI защищён PIN-кодом в браузере;
- многие backend write endpoints имеют `@ApiBearerAuth()`, но не имеют `@UseGuards(JwtAdminGuard)`;
- admin frontend не получает и не отправляет backend admin JWT для большинства операций.

Почему это важно:

- CORS и browser PIN не являются серверной авторизацией;
- если API публично доступен, write endpoints можно вызвать напрямую.

Рекомендация:

1. Сначала внедрить настоящий admin login flow в admin UI через `/api/auth/login`.
2. Затем закрыть write endpoints через `JwtAdminGuard`.
3. Только после этого убирать browser-side PIN или оставлять его как дополнительный локальный барьер, но не как security boundary.

### High. Referral settings UI does not drive actual bonus awarding reliably

Файлы:

- [backend/src/modules/referrals/referrals.service.ts](../../backend/src/modules/referrals/referrals.service.ts)
- [backend/src/modules/system-settings/system-settings.service.ts](../../backend/src/modules/system-settings/system-settings.service.ts)
- [admin/components/Settings.tsx](../../admin/components/Settings.tsx)

Проблема:

- admin settings пишут `REFERRAL_BONUS_PERCENT`, `REFERRAL_MIN_PAYOUT`, `REFERRAL_ENABLED` в таблицу `SystemSettings`;
- `ReferralsService.awardReferralBonus()` читает `REFERRAL_BONUS_PERCENT` из `ConfigService`, то есть из env, а не из `SystemSettings`;
- `awardReferralBonus()` не найден в call graph, то есть реферальный бонус, вероятно, вообще не начисляется после покупки.

Рекомендация:

1. Подключить начисление реферального бонуса в successful order fulfillment/payment flow.
2. Читать процент и enabled flag из `SystemSettings`, а не из env.
3. Добавить runtime test: referral user -> completed order -> referrer bonus transaction.

### High. Loyalty level recalculation is not wired into purchase flow

Файлы:

- [backend/src/modules/loyalty/loyalty.service.ts](../../backend/src/modules/loyalty/loyalty.service.ts)
- [backend/src/modules/orders/orders.service.ts](../../backend/src/modules/orders/orders.service.ts)

Проблема:

- `LoyaltyService.updateUserLevel()` существует;
- после `totalSpent` increment в `OrdersService.fulfillOrder()` вызов пересчёта уровня не найден;
- клиентский баг "система лояльности похоже не работает" выглядит подтверждённым как wiring gap.

Рекомендация:

1. После successful completed order пересчитывать loyalty level.
2. Проверить, в какой момент применять скидку: до или после обновления уровня.
3. Добавить тест на переход пользователя между уровнями после покупки.

### Medium. Root package scripts are ambiguous for a monorepo

Файл: [package.json](../../package.json)

Проблема:

- root `build` сейчас собирает только `client`;
- root `start` запускает только `client`;
- root `dev` запускает `backend + admin + bot`, но не `client`.

Почему это важно:

- для разработчика `npm run build` в корне выглядит как сборка всего проекта, но фактически это не так;
- для Railway это может быть осознанной настройкой конкретного service, поэтому менять scripts без проверки deployment settings нельзя.

Рекомендация:

1. Проверить Railway service-level build/start commands.
2. После этого разделить scripts явно: `build:client`, `build:all`, `start:client`, `start:all`.
3. Обновить `docs/operations/setup.md`.

### Medium. Bot contains unused legacy API methods for order/payment creation

Файл: [bot/src/api.ts](../../bot/src/api.ts)

Проблема:

- `api.orders.create()` отправляет `userId` в body;
- backend `POST /api/orders` сейчас защищён `JwtUserGuard` и берёт user id из JWT;
- в текущем bot code эти методы не используются, но будущие bot scenes могут сломаться, если начнут их вызывать.

Рекомендация:

- либо удалить/пометить legacy методы;
- либо реализовать bot-specific backend flow;
- либо научить bot получать/передавать user JWT для order creation.

### Medium. Product sync semantics are split between legacy provider helper and real catalog sync

Файлы:

- [backend/src/modules/esim-provider/esim-provider.service.ts](../../backend/src/modules/esim-provider/esim-provider.service.ts)
- [backend/src/modules/products/products.service.ts](../../backend/src/modules/products/products.service.ts)
- [backend/src/modules/products/products.controller.ts](../../backend/src/modules/products/products.controller.ts)

Проблема:

- legacy-метод `EsimProviderService.syncProducts()` действительно только получает пакеты и ничего не пишет в БД;
- но реальный admin route `POST /products/sync` вызывает `ProductsService.syncWithProvider()`, который уже делает upsert в `EsimProduct`, обновляет provider fields и сохраняет часть ручных metadata;
- из-за этого документация легко уходит в ложный вывод "sync ещё не реализован", хотя фактическая проблема уже другая: semantics массового sync/reprice/dedupe не зафиксированы и не все admin operations закрыты auth.

Рекомендация:

- зафиксировать, какой метод считать source of truth для catalog sync;
- явно описать, какие поля sync может перезаписывать, а какие остаются ручными;
- добавить auth и при необходимости preview/audit trail для `sync`, `reprice`, `bulk-*`, а не только для `dedupe`.

## Что уже проверено

- Markdown links в `README.md` и `docs/**/*.md` резолвятся.
- `client` TypeScript check проходит: `npx tsc --noEmit -p client/tsconfig.json`.
- Phase 2 smoke подтвердил локальные backend/admin/client HTTP endpoints.

## Что не проверялось в этом аудите

- production Railway env и service commands;
- реальные provider/payment webhooks;
- bot polling/webhook с настоящим Telegram token;
- browser E2E с авторизацией и покупкой.
