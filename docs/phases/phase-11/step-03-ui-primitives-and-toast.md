# Step 03 — UI-примитивы и замена alert/confirm

> [⬅️ Phase 11](../phase-11-admin-panel-refactoring.md)

## Цель

Создать shared UI-компоненты с accessibility, сразу заменить все `alert()` / `confirm()`.

## Что нужно сделать

1. Создать `admin/components/ui/`:
   - `Button.tsx` — variants: primary, secondary, destructive, ghost; sizes: sm, md, lg; `aria-label` обязателен для icon-only кнопок
   - `Modal.tsx` — overlay + card + close, **focus trap**, `Escape` для закрытия, `aria-modal="true"`, `role="dialog"`
   - `Table.tsx` — стили таблицы + `SortableHeader`
   - `Spinner.tsx` — центрированный спиннер
   - `Pagination.tsx` — единый пагинатор (консолидация из Orders + Users)
   - `Toast.tsx` — notification, **`aria-live="polite"`**, auto-dismiss 5s
   - `ToastProvider.tsx` — React Context + provider. Экспортирует `useToast()` hook из этого же файла.
   - `ConfirmDialog.tsx` — модальное подтверждение, **focus trap**, `Escape` для закрытия, keyboard accessible
2. Подключить `ToastProvider` в root `layout.tsx`.
3. Заменить во всех компонентах:
   - `alert('✅ ...')` → `toast.success('...')`
   - `alert('❌ ...')` → `toast.error('...')`
   - `confirm('...')` → `await confirmDialog('...')`
   - Затрагивает: Products (18 вхождений: sync, CRUD, bulk ops), Settings (19: pricing, referrals, loyalty), Orders (3: cancel, export), PromoCodes (2: create error, delete confirm).
4. CSS cleanup в `globals.css`:
   - Убрать `* { @apply transition-colors duration-200 }` (wildcard transitions)
   - Добавить `.glass-card--static` — без hover `translateY(-2px)` для таблиц

## Результат шага

- `admin/components/ui/` содержит 8 UI-компонентов с базовой accessibility.
- Поиск по коду не возвращает `alert(` в `admin/**/*.{ts,tsx}`.
- Поиск по коду не возвращает `confirm(` в `admin/**/*.{ts,tsx}`.
- Toast-уведомления при CRUD-операциях.
- Wildcard `*` transitions убраны из globals.css.
- `npm run build` проходит.

## Зависимости

- Step 01 (типы).

## Статус

`planned`

## Файлы

- `admin/components/ui/` — [NEW] 8 файлов
- `admin/app/globals.css` — убрать wildcard transition, добавить glass-card--static
- `admin/components/Products.tsx` (или `products/`) — замена alert/confirm (18)
- `admin/components/Settings.tsx` — замена alert/confirm (19)
- `admin/components/Orders.tsx` — замена alert/confirm (3)
- `admin/components/PromoCodes.tsx` — замена alert/confirm (2)

## Тестирование / Верификация

- Products: массовый toggle → toast "Обновлено N продуктов" вместо alert.
- Products: массовый toggle active → ConfirmDialog → Tab/Enter для навигации → отмена/подтверждение.
- Orders: отмена заказа → ConfirmDialog "Отменить заказ?" вместо `confirm()`.
- Settings: сохранить pricing → toast "Настройки сохранены" вместо alert.
- PromoCodes: удаление → ConfirmDialog "Удалить промокод?" вместо `confirm()`.
- Modal: `Escape` закрывает, фокус возвращается к trigger element.
- Toast: появляется, исчезает через 5s, screenreader анонсирует (проверить `aria-live`).
- Убранные CSS transitions не сломали hover-эффекты sidebar и кнопок.
- `npm run build` проходит.
