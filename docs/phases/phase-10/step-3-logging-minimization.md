# Шаг 3. Provider и payment logging minimization

> [⬅️ Назад к фазе](../phase-10-client-payments-and-provider-hardening.md)

## Цель

Сократить logging surface в `payments` и `esim-provider`, чтобы production logs не содержали full raw payload/response без необходимости, но при этом сохраняли operational usefulness.

## Что нужно сделать

### 3.1 Провести inventory чувствительных логов

- Проверить текущие логи в:
  - `backend/src/modules/esim-provider/providers/esimaccess.provider.ts`;
  - `backend/src/modules/payments/payments.service.ts`;
  - при необходимости смежные payment/provider сервисы.
- Выделить, какие поля могут считаться чувствительными или operationally excessive:
  - ICCID;
  - activation-related поля;
  - payment identifiers;
  - full provider response bodies;
  - webhook payloads с user-linked metadata.

### 3.2 Ввести safe logging baseline

- Заменить full raw logs на masked/short-form logs по умолчанию.
- Сохранить correlation usefulness:
  - orderId;
  - truncated provider/payment ids;
  - response status / success flag / error code.
- Если нужен подробный debug, он должен включаться явно, а не быть default production behavior.

### 3.3 Сверить troubleshooting path

- Убедиться, что после сокращения логов on-call всё ещё может понять:
  - какой заказ упал;
  - на каком шаге payment/provider chain произошёл сбой;
  - нужен ли retry/manual action.

## Результат шага

- Production logging больше не dump-ит чувствительные provider/payment payloads по умолчанию.
- Debuggability сохраняется через masked identifiers и структурированные сообщения.

## Статус

Не начато

## Журнал изменений

- 

## Файлы

- `backend/src/modules/esim-provider/providers/esimaccess.provider.ts`
- `backend/src/modules/payments/payments.service.ts`
- при необходимости: `backend/src/modules/payments/cloudpayments.service.ts`

## Тестирование / Верификация

- Purchase/topup/webhook flows продолжают логироваться, но без full raw body dumps.
- В логах сохраняются order/payment correlation identifiers, пригодные для incident triage.
- Нет regression в provider/payment happy path.
