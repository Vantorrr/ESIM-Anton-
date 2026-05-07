# Шаг 3. Подготовить migration rollout

> [⬅️ Назад к фазе](../phase-8-production-readiness-and-railway-rollout.md)

## Цель

Не сломать существующую production DB baseline migration'ом.

## Что нужно сделать

- сравнить production schema с baseline;
- если schema уже соответствует, выполнить `prisma migrate resolve --applied 20260507_init`;
- если не соответствует, подготовить отдельный migration plan.

## Результат шага

`prisma migrate deploy` безопасен для production.

## Статус

Не начато

## Журнал изменений

- 

## Файлы

- 

## Тестирование / Верификация

- 
