# Шаг 4. Minimal checkout UX, verification и wiki updates

> [⬅️ Назад к фазе](../phase-14-cloudpayments-tokenized-repeat-payments.md)

## Цель

Дать пользователю достаточный production UX для повторной **purchase** оплаты по привязанной карте и зафиксировать результат в документации без расширения в несвязанный wallet management.

## Что нужно сделать

- Обновить checkout UX:
  - показать вариант оплаты привязанной картой;
  - оставить явный путь “оплатить новой картой”.
- Не строить отдельный большой раздел управления картами, если он не нужен для purchase repeat payment.
- Добавить минимальные client API helpers для получения токена/маски текущей привязанной карты.
- Обновить wiki/runbooks:
  - что делает checkbox;
  - как работает token repeat payment;
  - какие ограничения остаются.
- Пройти smoke verification в основных runtime:
  - mobile browser;
  - Telegram Mini App;
  - purchase success/fail/fallback.

## Результат шага

- Пользователь может воспользоваться привязанной картой на следующей purchase-оплате.
- Документация соответствует реально реализованному, а не расширенному воображаемому scope.

## Зависимости

- Шаг 2
- Шаг 3

## Статус

- `in_progress`

## Журнал изменений

### 2026-05-17

- Шаг намеренно ограничен purchase repeat-payment UX без построения большого profile/payment-methods раздела, но не допускает временных/ломких UX решений.

### 2026-05-17 — repo baseline

- Minimal checkout UX уже собран в purchase flow:
  - user видит active saved card;
  - user может переключиться на новую карту;
  - отдельный wallet/payment-methods раздел не создаётся.
- Client API helper baseline уже добавлен:
  - `GET /payments/cards/active`
  - `POST /payments/charge-saved-card`
- Saved-card UX сознательно ограничен только `client/app/product/[id]/page.tsx`.
  `topup` и `balance` страницы не получили tokenized path и не обещаются документацией.
- Wiki baseline обновлён:
  - `docs/operations/cloudpayments-runbook.md`
  - `docs/architecture/payment-flow-audit.md`
  - `docs/operations/payment-production-checklist.md`
- В production checklist добавлены отдельные smoke cases:
  - saved-card purchase success;
  - saved-card fallback на новую карту.

## Ограничение текущего состояния

Шаг пока нельзя честно пометить `completed`, потому что внешняя verification часть ещё не пройдена:

- не подтверждён real mobile browser smoke;
- не подтверждён Telegram Mini App smoke;
- не подтверждён реальный provider success/fail response shape для saved-card charge;
- не подтверждён full fallback contour на production/test terminal.

## Файлы

- `client/lib/api.ts`
- `client/app/product/[id]/page.tsx`
- `client/app/topup/[orderId]/page.tsx`
- `client/app/balance/page.tsx`
- `docs/operations/cloudpayments-runbook.md`
- `docs/architecture/payment-flow-audit.md`

## Тестирование / Верификация

- Пользователь видит и может использовать привязанную карту.
- Пользователь может выбрать новую карту.
- Wiki и runbooks не обещают tokenized top-up / balance-topup до отдельного follow-up расширения.
- UX/state transitions не требуют последующей переделки при будущем добавлении tokenized top-up / balance-topup.
