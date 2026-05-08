# Referral Runtime

> [Корневой документ wiki](../README.md)

> Актуальный runtime-контракт referral flow после follow-up правок в `backend`, `client` и `bot`.

## Scope

Этот документ описывает только текущий runtime referral-модуля:

- referral registration из Telegram bot;
- client-facing referral stats для `web` и `Telegram Mini App`;
- admin/internal referral endpoints;
- spending referral bonus с учётом `minPayout`;
- lifecycle bonus hold-ов в card payment flow.

## Source Of Truth

- `backend/src/modules/referrals/referrals.controller.ts`
- `backend/src/modules/referrals/referrals.service.ts`
- `backend/src/modules/orders/orders.service.ts`
- `backend/src/modules/payments/cloudpayments.service.ts`
- `client/app/referrals/page.tsx`
- `client/components/AuthProvider.tsx`
- `bot/src/api.ts`
- `bot/src/commands/index.ts`

## API Surface

### Client-facing route

- `GET /referrals/me`
- guard: `JwtUserGuard`
- consumer: `client/app/referrals/page.tsx`

Response shape:

- `referralCode: string`
- `referralLink: string`
- `referralsCount: number`
- `totalEarnings: number`
- `referralPercent: number`
- `enabled: boolean`
- `minPayout: number`
- `referrals: Array<{ id, name, joinedAt, totalOrders, totalSpent }>`

`referralLink` строится на backend как `https://t.me/<bot>?start=ref_<referralCode>`. Клиент должен использовать это поле как source of truth, а не собирать ссылку самостоятельно.

### Admin/internal routes

- `GET /referrals/stats/:userId`
- `GET /referrals/top`
- guard: `JwtAdminGuard`

Эти маршруты больше не являются client-facing и не должны использоваться пользовательским фронтом или ботом.

### Bot registration route

- `POST /referrals/register`
- body: `{ userId, referralCode, telegramId }`
- required header: `x-telegram-bot-token`

Контракт intentionally не переведён на user JWT, чтобы не ломать bot flow. При этом endpoint больше не доверяет одному только `userId`:

- контроллер проверяет `x-telegram-bot-token` против backend-configured bot token;
- сервис сверяет `telegramId` из запроса с пользователем в БД;
- повторная привязка блокируется через anti-rebind guard по `referredById`;
- self-referral по-прежнему запрещён.

## Web And Telegram Client Behavior

Страница `/referrals` должна жить через единый auth layer, а не через самостоятельную развилку по режимам.

- `web`: используется существующий user JWT;
- `Telegram Mini App`: auth bootstrap идёт через `AuthProvider` и WebApp auth flow;
- если Telegram auth не завершился, страница показывает явное состояние `telegram-auth-required`, а не generic data-load error.

Практический смысл:

- страница не должна сама собирать Telegram auth;
- страница не должна ходить в admin/internal referral endpoints;
- вся runtime загрузка referral stats должна идти только через `/referrals/me`.

## Referral Bonus And `minPayout`

`minPayout` относится только к referral bonus, а не ко всему `bonusBalance`.

Правило расчёта:

- cashback-часть бонусов доступна без порога;
- referral-часть доступна только если доступный referral balance `>= minPayout`;
- итоговый бонусный лимит для покупки = `cashback available + referral available above threshold`, с ограничением requested/useBonuses и total amount заказа.

Исторический `bonusBalance` не мигрируется задним числом по отдельным кошелькам. Модель deliberately forward-only:

- старые остатки не перераскладываются идеально;
- начиная с новых spending/accrual операций, ledger обязан оставлять достаточный metadata trail;
- для `BONUS_SPENT` metadata содержит как минимум `spentFromReferral` и `spentFromCashback`.

## Bonus Hold Lifecycle In Card Flow

Card payment flow больше не должен сразу окончательно списывать бонусы.

Текущая модель:

1. При создании card order backend создаёт `BONUS_SPENT` hold со статусом `PENDING`.
2. Пока hold активен, availability helper учитывает его и не даёт зарезервировать те же бонусы повторно.
3. После успешной оплаты hold финализируется.
4. На payment fail hold должен релизиться.
5. Протухшие hold-ы очищаются автоматически вместе со связанными `PENDING` orders и pending payment transactions.

Сейчас TTL для stale bonus hold-ов зафиксирован в `OrdersService` и составляет `30 минут`.

## Integration Boundaries

- Referral award boundary живёт в purchase completion flow, а не в payment handlers per provider.
- Top-up flow intentionally не должен создавать referral reward side effects.
- При изменении loyalty/referral логики нельзя дублировать award/release поведение в нескольких местах.

## Verification Baseline

Минимальная проверка после изменений:

- `backend`: `npx jest src/modules/referrals/referrals.service.spec.ts src/modules/referrals/referrals.controller.spec.ts src/modules/orders/orders.service.spec.ts --runInBand`
- `backend`: `npx tsc --noEmit -p tsconfig.json`
- `client`: `npx tsc --noEmit --incremental false`
- `client`: `npx next lint`

Runtime smoke before production:

- web login -> `/referrals`;
- Telegram Mini App cold start -> `/referrals`;
- `/start ref_<code>` для нового пользователя;
- order with cashback-only bonus;
- order with referral bonus below `minPayout`;
- order with referral bonus above `minPayout`;
- abandoned card payment -> retry after stale hold cleanup.
