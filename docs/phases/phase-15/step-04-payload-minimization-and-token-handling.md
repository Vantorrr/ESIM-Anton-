# Шаг 4. Sensitive payload minimization и token handling hardening

> [Назад к Phase 15](../phase-15-payment-and-webhook-security-hardening.md)

## Цель

Сузить storage/API/logging surface для CloudPayments token и сырых payment payloads.

## Что нужно сделать

- Убрать сохранение полного CloudPayments webhook body и полного token-charge provider payload в `transaction.metadata`, где это не нужно.
- Перейти на safelist полей для audit/reconciliation.
- Проверить user/admin transaction endpoints на возврат чувствительных payment данных.
- Зафиксировать redaction policy для payment logs и metadata.
- Принять обязательное решение по token at-rest handling и internal read boundaries:
  - либо шифрование токена at rest;
  - либо явно задокументированная compensating-control policy с ограничением read paths;
  - вариант “оставим как есть и вернёмся позже” в рамках этой фазы недопустим.
- Не строить общую crypto/secrets abstraction для всего проекта, если задача закрывается локальным решением на payment token boundary.

## Результат шага

- `Token` и сырые processor payloads не гуляют по transaction API surface и metadata без необходимости.
- Payment audit trail остаётся достаточным для support/reconciliation, но без лишних секретов.
- Для chargeable token зафиксирован явный enterprise-grade at-rest/read policy, а не временная оговорка.
- Hardening остаётся сфокусированным на текущем CloudPayments token contour, без лишней платформенной абстракции.

## Зависимости

- [Шаг 1. Threat model и security baseline для payment/webhook контуров](./step-01-threat-model-and-baseline.md)

## Статус

- `planned`

## Журнал изменений

### 2026-05-17

- Шаг вынесен отдельно от orchestration, потому что он затрагивает storage contract, API shape и operational debugging policy.

## Файлы

- `backend/src/modules/payments/cloudpayments.service.ts`
- `backend/src/modules/payments/payments.service.ts`
- `backend/src/modules/payments/payments.controller.ts`
- `backend/prisma/schema.prisma`
- `docs/architecture/gotchas.md`
- `docs/operations/cloudpayments-runbook.md`

## Тестирование / Верификация

- User/admin transaction endpoints не возвращают CloudPayments token.
- Logs и metadata сохраняют только safelist-поля.
- Existing support triage всё ещё может найти payment by orderId / transactionId / reasonCode.
- Решение по token storage не размывает backend-only trust boundary и не создаёт новый широкий internal read surface.
