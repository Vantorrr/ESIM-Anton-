# Шаг 2. Widget tokenization и webhook token capture

> [⬅️ Назад к фазе](../phase-14-cloudpayments-tokenized-repeat-payments.md)

## Цель

Довести текущий widget flow до состояния, где он реально запрашивает tokenization и сохраняет token после успешной первой оплаты, при этом первой целевой интеграцией остаётся purchase flow, а качество webhook/persistence contour соответствует production-grade требованиям.

## Что нужно сделать

- Добавить в текущий CloudPayments widget flow нужный tokenization параметр.
- Убедиться, что в purchase flow передаётся корректный `AccountId`, и не сломать остальные widget-based сценарии.
- Расширить обработку `Pay`-уведомления:
  - извлечение token;
  - извлечение card mask/brand/expiry, если они реально приходят;
  - привязка token к пользователю.
- Сохранить текущую идемпотентность payment processing.
- Не ломать существующий success/fail flow по заказам и balance top-up.

## Результат шага

- Первая успешная purchase-оплата с согласия пользователя даёт token и минимальную карточную метаинформацию.
- Token persistence встроен в существующий webhook flow без широкой переработки payments domain и без снижения его идемпотентности/наблюдаемости.

## Зависимости

- Шаг 1

## Статус

- `in_progress`

## Журнал изменений

### 2026-05-17

- Шаг сфокусирован на реальном включении функционала checkbox, а не на полном management контуре карт.

### 2026-05-17 — repo baseline

- В `client/lib/cloudpayments.ts` добавлен флаг `saveCard`; в widget options передаются оба варианта ключа:
  - `saveCard`
  - `SaveCard`
  Это сделано из-за непоследовательности naming surface в документации CloudPayments между widget/examples и API tables.
- В purchase checkout (`client/app/product/[id]/page.tsx`) включён `saveCard: true`.
  Scope намеренно ограничен `purpose: 'esim_order'`; top-up и balance-topup пока не запрашивают tokenization.
- В backend `CloudPaymentsService` добавлена валидация `AccountId` для order-based `Check/Pay`, чтобы token ownership был привязан к реальному owner заказа, а не к доверенному фронтовому значению.
- В `Pay`-обработке добавлен token capture baseline:
  - берётся `Token`;
  - строится `cardMask` из `CardLastFour`;
  - читаются `CardType` и `CardExpDate`;
  - токен сохраняется только для `purpose: 'esim_order'`;
  - предыдущие active token этого пользователя деактивируются с причиной `replaced_by_new_token`.
- Идемпотентность сохранена через `upsert` по `cloudPaymentsToken` и прежние guards по payment transaction.
- Локальная верификация пройдена:
  - Prisma schema valid;
  - backend typecheck passed;
  - `cloudpayments.service.spec.ts` passed;
  - client typecheck passed.

## Ограничение текущего состояния

Шаг ещё не может считаться полностью завершённым без test-terminal smoke:

- нужно увидеть реальный `Pay` payload с `Token`;
- нужно подтвердить, что выбранный widget option spelling действительно активирует token return на текущем терминале;
- нужно проверить, не отличается ли payload по `CardExpDate`/`CardType` от документации на фактическом терминале.

## Файлы

- `client/lib/cloudpayments.ts`
- `client/app/product/[id]/page.tsx`
- `client/app/topup/[orderId]/page.tsx`
- `client/app/balance/page.tsx`
- `backend/src/modules/payments/cloudpayments.service.ts`

## Тестирование / Верификация

- Pay webhook получает token при нужной конфигурации.
- Duplicate webhook не создаёт duplicate token record.
- Existing widget payment flow остаётся рабочим.
