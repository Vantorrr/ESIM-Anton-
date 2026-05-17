# Шаг 1. CloudPayments token contract и минимальная data model

> [⬅️ Назад к фазе](../phase-14-cloudpayments-tokenized-repeat-payments.md)

## Цель

Подтвердить реальный CloudPayments token contract и определить production-grade модель хранения, достаточную для purchase repeat payments и не блокирующую последующее расширение на top-up и balance top-up.

## Что нужно сделать

- Подтвердить по документации и test terminal:
  - `tokenize: true` / `SaveCard`;
  - обязательность `AccountId`;
  - exact поля `Pay`-уведомления;
  - метод списания по токену и его ограничения.
- Спроектировать минимальную модель хранения:
  - `userId`
  - `accountId`
  - `cloudpaymentsToken`
  - `cardMask`
  - `cardBrand`
  - `expMonth`
  - `expYear`
  - `isActive`
  - `lastUsedAt`
  - `createdAt`
  - `updatedAt`
- Зафиксировать, нужна ли поддержка нескольких токенов на пользователя в рамках этой фазы или достаточно одного активного токена.
- Описать минимальный consent/audit след, достаточный для этой фазы.
- Явно отделить:
  - что нужно именно для purchase repeat payment сейчас;
  - какие поля/связи стоит заложить сразу, чтобы не ломать схему при будущей поддержке top-up / balance-topup.
- Отдельно зафиксировать, какие элементы модели являются обязательными именно по enterprise-quality требованиям:
  - owner binding;
  - token disable policy;
  - auditability;
  - production-safe uniqueness constraints.

## Результат шага

- Provider contract подтверждён.
- Определена минимальная schema для tokenized repeat payments.
- Schema пригодна для будущего расширения repeat charge на другие card-based flows без обязательной миграции-переделки.
- Scope хранения карт не разрастается в полноценный wallet domain, но и не упрощается до временной схемы, которую потом придётся ломать.

## Зависимости

- Нет

## Статус

- `completed`

## Журнал изменений

### 2026-05-17

- Шаг создан как narrow baseline для repeat-payments фазы вместо широкой saved-cards platform.

### 2026-05-17 — continuation

- Подтверждён docs-level contract:
  - `AccountId` нужен для корректного one-click token flow;
  - `Pay` содержит `Token` и карточную метаинформацию;
  - repeat charge делается через server-side API по токену и `AccountId`.
- В кодовой базе подтверждено, что текущий runtime уже передаёт `accountId = user.id` во все CloudPayments widget flow, а token storage пока отсутствует полностью.
- Зафиксирована минимальная persistence-модель `cloudpayments_card_tokens`:
  - `userId`
  - `accountId`
  - `cloudPaymentsToken`
  - `cardMask`
  - `cardBrand`
  - `expMonth`
  - `expYear`
  - `isActive`
  - `consentCapturedAt`
  - `sourceTransactionId`
  - `sourceInvoiceId`
  - `lastUsedAt`
  - `deactivatedAt`
  - `deactivationReason`
  - `createdAt`
  - `updatedAt`
- Принято решение не ограничивать схему одним токеном на пользователя жёстким `UNIQUE(userId)`.
  Вместо этого:
  - у пользователя могут быть исторические записи;
  - в runtime этой фазы используется один active token;
  - старые токены должны деактивироваться, а не silently удаляться.
- Для auditability заложены `consentCapturedAt`, `sourceTransactionId`, `sourceInvoiceId`, `deactivatedAt`, `deactivationReason`.
- В Prisma добавлена новая модель и SQL migration baseline для последующих шагов.

## Файлы

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*`
- `docs/operations/cloudpayments-runbook.md`

## Тестирование / Верификация

- Подтверждён real/test provider contract.
- Schema не хранит raw card data.
- Модель достаточна для repeat charge, но не перегружена лишними сущностями.
