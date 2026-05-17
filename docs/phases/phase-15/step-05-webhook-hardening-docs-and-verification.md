# Шаг 5. eSIM webhook replay hardening, docs и verification

> [Назад к Phase 15](../phase-15-payment-and-webhook-security-hardening.md)

## Цель

Усилить degraded-auth path eSIM webhook-а и синхронизировать финальный security baseline в документации и verification matrix.

## Что нужно сделать

- Добавить replay/dedup/freshness защиту для unsigned webhook path с `rt-accesscode`.
- Ограничить набор `notifyType`, которые допустимы в degraded-auth режиме.
- Проверить, что live `ORDER_STATUS` callbacks по-прежнему проходят и не теряются.
- Обновить phase docs, integrations wiki, gotchas и operational instructions.
- Завершить verification matrix для всей Phase 15.
- Не вводить отдельную webhook platform abstraction, если current risk закрывается hardening текущего `ORDER_STATUS` compatibility path.
- Primary target этого шага — текущий live compatibility path для `ORDER_STATUS` от eSIM Access, а не общий redesign всех возможных unsigned provider events.

## Результат шага

- eSIM webhook compatibility с live provider сохранена, но replay surface уменьшен.
- Wiki и runbooks отражают реальный security contract без старых ложных предположений.
- Решение остаётся локальным для текущего eSIM Access webhook path и не разрастается в универсальную webhook subsystem.

## Зависимости

- [Шаг 1. Threat model и security baseline для payment/webhook контуров](./step-01-threat-model-and-baseline.md)

## Статус

- `completed`

## Журнал изменений

### 2026-05-17

- Шаг оформлен как финальный, потому что он связывает code hardening, docs sync и runtime verification.
- Для degraded-auth path введён durable replay barrier `esim_webhook_receipts`:
  - guard claim-ит unsigned `ORDER_STATUS` по dedup key;
  - duplicate/replay того же unsigned события отклоняется до service processing;
  - receipt остаётся в БД после успешной обработки и удаляется только при failed processing, чтобы provider retry оставался возможен.
- Unsigned compatibility path больше не является общим bypass:
  - без подписи разрешён только `CHECK_HEALTH`;
  - через `rt-accesscode` разрешён только `ORDER_STATUS`;
  - событие обязано содержать валидный `eventGenerateTime` и укладываться в freshness window.
- `ORDER_STATUS/GOT_RESOURCE` provider query больше не проглатывает runtime error молча: при failure webhook возвращается в retryable path вместо ложного "успеха".

## Файлы

- `backend/src/modules/esim-provider/esim-webhook.guard.ts`
- `backend/src/modules/esim-provider/esim-webhook.service.ts`
- `backend/src/modules/esim-provider/*.spec.ts`
- `docs/phases/phase-13-esim-webhook-integration.md`
- `docs/integrations/esim-access.md`
- `docs/architecture/runtime-and-operations.md`
- `docs/architecture/gotchas.md`

## Тестирование / Верификация

- Signed webhook path продолжает работать.
- Unsigned degraded-auth path принимает только допустимые live callbacks и не бесконечно replay-ится.
- Docs и runbooks совпадают с текущим кодом и observed runtime.
- Payment hardening из предыдущих шагов не создаёт регрессий в других callback/runtime paths, которые живут в тех же shared модулях.
