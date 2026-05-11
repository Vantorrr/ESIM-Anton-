# Step 02 — Декомпозиция Products.tsx

> [⬅️ Phase 11](../phase-11-admin-panel-refactoring.md)

## Цель

Разбить монолитный `Products.tsx` (1307 строк) на фокусированные компоненты и custom hook, сохранив обратную совместимость через re-export.

## Что нужно сделать

1. Создать `admin/components/products/` со структурой:
   - `ProductsPage.tsx` — оркестратор (state + layout, ~80 строк)
   - `ProductsToolbar.tsx` — кнопки "Добавить / Синхронизировать / Обновить курс"
   - `ProductsFilters.tsx` — 5 фильтров (страна, тип, поиск, статус, безлимит) + статистика
   - `ProductsTable.tsx` — таблица с чекбоксами, header, сортировка
   - `ProductsTableRow.tsx` — одна строка (pricing calculations, badges)
   - `ProductsBulkActions.tsx` — sticky bar массовых действий
   - `ProductEditModal.tsx` — форма редактирования/создания
   - `ProductViewModal.tsx` — детальный просмотр тарифа
   - `BulkBadgeModal.tsx` — модалка массового бейджа
   - `BulkMarkupModal.tsx` — модалка массовой наценки
   - `useProducts.ts` — hook: загрузка, фильтрация, selection, bulk operations
2. Все компоненты используют типы из `types.ts` (Step 01).
3. Заменить `Products.tsx` на re-export: `export { default } from './products/ProductsPage'`.

## Результат шага

- `Products.tsx` содержит только re-export (< 10 строк).
- Каждый компонент < 200 строк.
- Весь функционал Products сохранён: CRUD, фильтры, bulk ops, модалки.
- `npm run build` проходит.

## Зависимости

- Step 01 (типы для `AdminProduct`, `CreateProductDto` и др.).

## Статус

`planned`

## Файлы

- `admin/components/products/` — [NEW] 11 файлов
- `admin/components/Products.tsx` — re-export

## Тестирование / Верификация

- `npm run build` проходит.
- Smoke: создание продукта, редактирование, sync, массовый toggle active.
- Фильтрация: выбор страны → таблица фильтруется, счётчик обновляется.
- Массовые действия: выбрать 5 продуктов → toggle active → подтверждение → статус изменён.
- Массовый бейдж: выбрать → задать бейдж → применить → отображается в строках.
- Pricing: изменение курса → цены пересчитываются.
