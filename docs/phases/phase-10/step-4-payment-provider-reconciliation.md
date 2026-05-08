# Шаг 4. Payment/provider reconciliation и operational visibility

> [⬅️ Назад к фазе](../phase-10-client-payments-and-provider-hardening.md)

## Цель

Снизить операционный риск сценариев, где платёж уже успешен, а provider side-effect завершился ошибкой или завис в промежуточном состоянии.

## Что нужно сделать

### 4.1 Зафиксировать state combinations

- Описать подтверждённые сценарии:
  - card payment succeeded -> order `PAID` -> provider failed -> order `FAILED`;
  - balance purchase -> balance debited -> provider failed -> refund;
  - topup balance flow -> debit -> provider failed -> refund.
- Для каждого сценария указать:
  - что видит пользователь;
  - что остаётся в БД;
  - какой manual follow-up нужен.

### 4.2 Добавить minimal detection / signal path

- Ввести минимальный механизм обнаружения paid-but-not-fulfilled scenario:
  - structured error log;
  - admin-visible marker;
  - отдельный query/report/list для ручной обработки;
  - или другой минимально-инвазивный operational signal.
- Не переделывать всю state machine и не добавлять speculative queue architecture без явной необходимости.

### 4.3 Зафиксировать retry/compensation policy

- Разделить policy для:
  - provider retry;
  - user compensation/refund;
  - manual support handling.
- Отдельно отметить различия между CloudPayments card orders, balance purchase и eSIM top-up.

## Результат шага

- Partial-failure cases больше не являются "тихими" operational dead zones.
- Для support/engineering появляется минимальный, но понятный путь triage и follow-up.

## Статус

Не начато

## Журнал изменений

- 

## Файлы

- `backend/src/modules/payments/cloudpayments.service.ts`
- `backend/src/modules/payments/payments.service.ts`
- `backend/src/modules/orders/orders.service.ts`
- возможно: `admin` surfaces или wiki/runbooks

## Тестирование / Верификация

- Искусственно воспроизводимый provider failure после successful payment оставляет диагностируемое состояние.
- Balance/topup compensation paths продолжают работать.
- Happy path card payment и happy path balance purchase не деградируют.
