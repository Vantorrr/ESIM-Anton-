# Шаг 2. Repeat-charge idempotency и anti-double-charge orchestration

> [Назад к Phase 15](../phase-15-payment-and-webhook-security-hardening.md)

## Цель

Убрать race conditions и second-charge windows из `POST /payments/charge-saved-card`.

## Что нужно сделать

- Ввести явный order/payment claim перед внешним вызовом CloudPayments token API.
- Сделать так, чтобы параллельные запросы по одному `orderId` не могли инициировать два независимых списания.
- Пересмотреть lifecycle `PAYMENT(PENDING)` transaction для saved-card flow.
- Зафиксировать canonical idempotency semantics в service tests и wiki.
- Реализация обязана быть cross-process и durable:
  - in-memory lock, singleton mutex, controller-static map или client-side coordination недопустимы;
  - claim/attempt contract должен работать при нескольких backend instances и после retry/redeploy.

## Результат шага

- Один order может иметь только один активный repeat-charge attempt в допустимом состоянии.
- Повторный запрос не создаёт второе списание и не размывает order state machine.
- Идемпотентность опирается на durable backend contract, а не на локальное состояние процесса.

## Зависимости

- [Шаг 1. Threat model и security baseline для payment/webhook контуров](./step-01-threat-model-and-baseline.md)

## Статус

- `completed`

## Журнал изменений

### 2026-05-17

- Шаг выделен как payment-critical и должен выполняться раньше payload minimization и webhook hardening.
- Добавлена таблица `repeat_charge_attempts` и enum `RepeatChargeAttemptStatus` как durable cross-process contract для one-order-one-attempt semantics.
- `PaymentsService.chargeOrderWithSavedCard()` теперь сначала claim-ит attempt в БД и только потом делает внешний вызов CloudPayments token API.
- Параллельный/retry запрос по тому же `orderId` больше не создаёт второй provider call:
  - существующий `IN_PROGRESS` attempt возвращает user-facing response без нового списания;
  - idempotency key теперь привязан к attempt contract, а не к controller-local логике.
- Shared/API contract `ChargeOrderWithSavedCardResponse` теперь возвращает явный `chargeState` и `repeatChargeAttemptId`, поэтому duplicate/in-progress path больше не определяется по тексту сообщения.
- Unit tests зафиксировали duplicate/in-progress сценарий как обязательный invariant.

## Файлы

- `backend/src/modules/payments/payments.service.ts`
- `backend/src/modules/payments/payments.controller.ts`
- `backend/src/modules/payments/payments.service.spec.ts`
- `backend/prisma/schema.prisma`

## Тестирование / Верификация

- Два параллельных вызова `charge-saved-card` по одному order не приводят к двум provider calls.
- Retry того же запроса не приводит к новому charge attempt без явной policy.
- Решение подтверждено на уровне multi-instance-safe semantics, а не только локального unit test happy path.
- Existing purchase success path не ломается.
- Обычный purchase widget flow, top-up и balance-topup не получают регрессию из-за shared payment code changes.
