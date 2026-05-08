# Шаг 5. Wiki и rollout guardrails

> [⬅️ Назад к фазе](../phase-10-client-payments-and-provider-hardening.md)

## Цель

Закрепить в wiki и phase-docs границы безопасного rollout, чтобы следующие сессии не превратили hardening phase в неконтролируемую архитектурную миграцию.

## Что нужно сделать

### 5.1 Обновить wiki по runtime tradeoffs

- Зафиксировать, что в текущем проекте считается intentional:
  - cached auth restore;
  - client-only App Router baseline;
  - provider calls вне DB transaction;
  - coexistence CloudPayments и Robokassa до отдельного migration decision.

### 5.2 Отделить backlog от текущей фазы

- Явно перечислить, что не входит в Phase 10:
  - массовый переход в RSC/SSR;
  - замена `localStorage` auth;
  - полное удаление Robokassa;
  - redesign всех client pages;
  - полный event-driven reconciliation platform.

### 5.3 Сверить roadmap

- Проверить, не нужно ли после завершения части этой фазы создать отдельные follow-up phases:
  - SSR/RSC migration for public routes;
  - payment gateway retirement/migration;
  - provider abstraction cleanup.

## Результат шага

- У следующих сессий есть понятные rollout guardrails.
- Wiki не подталкивает к unsafe sweeping changes под видом "улучшения".

## Статус

Не начато

## Журнал изменений

- 

## Файлы

- `docs/audits/audit.md`
- `docs/architecture/*.md`
- `docs/phases/README.md`
- `docs/phases/phase-10-client-payments-and-provider-hardening.md`

## Тестирование / Верификация

- Wiki и roadmap явно разделяют текущую hardening phase и будущие migration initiatives.
- В phase-docs нет рекомендаций, которые ломают текущий runtime без migration plan.
