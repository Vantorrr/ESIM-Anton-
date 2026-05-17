# Шаг 3. Ambiguous outcome и reconciliation policy для token charge

> [Назад к Phase 15](../phase-15-payment-and-webhook-security-hardening.md)

## Цель

Перестать трактовать network/timeout ошибки token charge как обычный decline и встроить recovery/reconciliation semantics.

## Что нужно сделать

- Разделить confirmed decline и unknown outcome в repeat-charge path.
- Ввести state/policy, пригодную для позднего recovery:
  - order не финализируется как `CANCELLED` на transport ambiguity;
  - fallback на widget не открывается до подтверждения, что первый charge не прошёл.
- Зафиксировать, как webhook/reconciliation/admin triage должны вести себя при позднем подтверждении оплаты.
- Обновить payment-flow wiki и operational runbook.
- Зафиксировать канонический durable contract для ambiguity:
  - отдельный persistence-level state, reconciliation marker или attempt entity;
  - допустимые формы решения ограничены расширением существующих `Order` / `Transaction` контрактов или явно выделенной attempt-сущностью внутри текущего payment contour;
  - отдельная новая доменная платформа reconciliation не вводится, если одна из этих форм закрывает риск;
  - ad-hoc хранение истины в `errorMessage`, свободных строках причин или произвольном `metadata` недопустимо.
- Не строить отдельный reconciliation service/queue/platform, если тот же риск закрывается:
  - через durable state contract;
  - через существующий payment module;
  - через явный admin/support runbook.

## Результат шага

- Timeout/transport error больше не создаёт paid-but-cancelled сценарий.
- У support и backend есть явная policy для late success / unknown outcome.
- Ambiguous outcome имеет каноническое durable представление в модели, пригодное для автоматизации и ручного triage.
- Решение остаётся локальным для текущего payment contour и не разрастается в отдельную platform subsystem без доказанной необходимости.

## Зависимости

- [Шаг 2. Repeat-charge idempotency и anti-double-charge orchestration](./step-02-repeat-charge-idempotency-and-locking.md)

## Статус

- `planned`

## Журнал изменений

### 2026-05-17

- Шаг выделен отдельно, потому что это уже не просто race fix, а state-machine и operations policy change.

## Файлы

- `backend/src/modules/payments/payments.service.ts`
- `backend/src/modules/payments/cloudpayments.service.ts`
- `docs/architecture/payment-flow-audit.md`
- `docs/operations/payment-production-checklist.md`
- `docs/operations/cloudpayments-runbook.md`

## Тестирование / Верификация

- Simulated timeout не переводит order в финально невалидный fallback state.
- Late success path не теряет already-captured payment.
- Widget fallback не открывается на ambiguous outcome.
- Runtime policy не ломает canonical completion boundary `OrdersService.fulfillOrder()` и не вводит hidden side effects для loyalty/referral/top-up flows.
