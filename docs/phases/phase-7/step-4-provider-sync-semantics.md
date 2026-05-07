# Шаг 4. Определить и реализовать provider sync semantics

> [⬅️ Назад к фазе](../phase-7-product-catalog-sync-and-tariff-metadata.md)

## Цель

Убрать несоответствие между названием `syncProducts()` и фактическим preview/TODO.

## Что нужно сделать

- выбрать mode: preview-only, dry-run + apply, или immediate upsert;
- реализовать upsert/diff или переименовать UI action в preview;
- добавить audit log или хотя бы понятный diff response.

## Результат шага

Admin понимает, что именно делает sync, и каталог не меняется неожиданно.

## Статус

Не начато

## Журнал изменений

- 

## Файлы

- 

## Тестирование / Верификация

- 
