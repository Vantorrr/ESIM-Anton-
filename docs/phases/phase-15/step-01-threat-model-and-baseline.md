# Шаг 1. Threat model и security baseline для payment/webhook контуров

> [Назад к Phase 15](../phase-15-payment-and-webhook-security-hardening.md)

## Цель

Зафиксировать точный threat model и boundaries перед кодовыми изменениями, чтобы hardening не строился на догадках.

## Что нужно сделать

- Перечитать текущие runtime точки:
  - `payments.service.ts`
  - `cloudpayments.service.ts`
  - `payments.controller.ts`
  - `esim-webhook.guard.ts`
  - `esim-webhook.service.ts`
- Разделить риски по категориям:
  - double charge / concurrency;
  - ambiguous outcome / reconciliation;
  - sensitive payload/token exposure;
  - webhook spoofing / replay.
- Зафиксировать, какие endpoints, metadata paths и logs сейчас нарушают минимальный trust boundary.
- Синхронизировать findings в wiki/runbooks как baseline для следующих шагов.

## Результат шага

- Есть подтверждённый security baseline фазы.
- Для каждого следующего шага известен конкретный risk class и expected invariant.

## Зависимости

- Нет

## Статус

- `completed`

## Журнал изменений

### 2026-05-17

- Шаг создан как стартовая точка новой hardening phase после security-аудита Phase 14.
- Повторная code inspection подтвердила четыре реальные группы рисков:
  - `POST /payments/charge-saved-card` не имел durable claim semantics и мог породить второй provider call при concurrency/retry;
  - transport/timeout ошибка token charge трактовалась как обычный decline и немедленно вела к `Order(CANCELLED) + fallbackToWidget`;
  - repeat-charge path тащил provider result дальше нужной boundary через `transaction.metadata`;
  - degraded-auth path у eSIM webhook по `rt-accesscode` оставался без replay/freshness policy и ограниченного event scope.
- В качестве canonical baseline для payment hardening выбран локальный durable attempt contract внутри текущего `payments` модуля, без выделения отдельной payment/reconciliation platform.

## Файлы

- `backend/src/modules/payments/*`
- `backend/src/modules/esim-provider/*`
- `docs/architecture/payment-flow-audit.md`
- `docs/architecture/gotchas.md`
- `docs/operations/cloudpayments-runbook.md`

## Тестирование / Верификация

- Threat model покрывает все реальные runtime branches, затронутые Phase 14 и live webhook verification.
- Не остаётся незафиксированных assumptions уровня “provider точно так делает всегда”.
