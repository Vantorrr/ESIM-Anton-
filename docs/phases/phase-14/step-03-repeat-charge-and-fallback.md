# Шаг 3. Repeat charge orchestration и fallback policy

> [⬅️ Назад к фазе](../phase-14-cloudpayments-tokenized-repeat-payments.md)

## Цель

Добавить backend capability повторной оплаты по токену для purchase flow и безопасную деградацию на обычный widget flow при сбоях, не закрывая дорогу будущему расширению на top-up / balance top-up и не упрощая state handling до временных решений.

## Что нужно сделать

- Добавить backend path оплаты по токену через CloudPayments API.
- Зафиксировать target contour этой фазы:
  - purchase — входит обязательно;
  - top-up — не входит в реализацию этой фазы;
  - balance top-up — не входит в реализацию этой фазы.
- Спроектировать helper/orchestrator так, чтобы потом его можно было переиспользовать в top-up / balance-topup без переписывания storage contract.
- Явно зафиксировать enterprise-grade state policy:
  - создаётся ли `PENDING` order до token charge или после;
  - можно ли fallback-нуться на widget для того же order;
  - что происходит с bonus hold при token fail;
  - как исключается dangling payment session.
- Зафиксировать fallback semantics:
  - invalid token;
  - expired token;
  - provider decline;
  - provider timeout.
- Согласовать судьбу `PENDING` order/transaction при token charge fail, чтобы не плодить dangling payment sessions.
- Добавить минимальную политику деактивации нерабочего токена.

## Результат шага

- Repeat charge работает для purchase checkout flow.
- При проблемах с токеном пользователь не блокируется и может оплатить новой картой.
- State policy формализована настолько, что follow-up расширение на top-up/balance не потребует перепридумывать базовые orchestration правила.

## Зависимости

- Шаг 1
- Шаг 2

## Статус

- `in_progress`

## Журнал изменений

### 2026-05-17

- Шаг ограничен repeat charge и fallback policy без превращения в полноценный payment orchestration platform refactor.

### 2026-05-17 — repo baseline

- В backend добавлен minimal repeat-charge contour поверх существующей order state machine:
  - `GET /payments/cards/active`
  - `POST /payments/charge-saved-card`
- Target boundary сохранён:
  - только `purchase`;
  - `top-up` не затронут;
  - `balance top-up` не затронут.
- Принята и реализована state policy:
  - сначала создаётся обычный `PENDING` purchase order через существующий `POST /orders`;
  - затем backend пытается списать оплату по active CloudPayments token;
  - при успехе order переводится в `PAID`, затем идёт в существующий `fulfillOrder()`;
  - при неуспешном token charge этот order **не** переиспользуется для widget fallback;
  - вместо этого order переводится в `CANCELLED`, pending payment tx закрывается, bonus hold release-ится, и клиент может создать fresh widget order.
- Тем самым сознательно запрещён fallback на тот же самый order.
  Это сделано, чтобы не плодить ambiguous payment session state и не смешивать в одном invoice:
  - неуспешный token charge;
  - потенциальный новый widget charge.
- Added minimal token disable policy:
  - token деактивируется только на явно permanent-ish reason codes:
    - `5033`
    - `5036`
    - `5041`
    - `5043`
    - `5054`
    - `5062`
    - `5063`
  - временные отказы вроде `5051` / `5096` token не деактивируют, а только ведут к widget fallback.
- В client purchase checkout добавлен minimal UX:
  - если есть active saved card и баланса не хватает, по умолчанию предлагается оплата привязанной картой;
  - пользователь может переключиться на новую карту;
  - при token fail клиент получает fallback message и создаёт fresh widget order.
- Локальная верификация пройдена:
  - backend specs;
  - backend typecheck;
  - client typecheck.

## Ограничение текущего состояния

Шаг ещё требует real terminal verification:

- нужно подтвердить фактический ответ `payments/tokens/charge` на вашем терминале;
- нужно увидеть реальные `ReasonCode`/`CardHolderMessage` на decline path;
- нужно проверить, что provider response shape не отличается от docs настолько, чтобы потребовалась коррекция parser-а;
- нужно проверить, что success charge и последующий webhook runtime не конфликтуют operationally на production terminal.

## Файлы

- `shared/contracts/checkout.ts`
- `backend/src/modules/orders/orders.service.ts`
- `backend/src/modules/orders/orders.controller.ts`
- `backend/src/modules/payments/payments.service.ts`
- `backend/src/modules/payments/payments.controller.ts`

## Тестирование / Верификация

- Repeat charge проходит для purchase flow.
- Token fail не оставляет сломанный checkout state.
- Fallback на новую карту воспроизводим и не ломает существующие webhook boundaries.
- Existing top-up / balance-topup flows не изменены функционально, но future extension seam сохранён.
