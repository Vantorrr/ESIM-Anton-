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

`completed`

## Файлы

- `admin/components/ui/` — shared primitives: `Button`, `Modal`, `Table`, `Spinner`, `Pagination`, `Toast`, `ToastProvider`, `ConfirmDialog`
- `admin/app/providers.tsx` — client boundary для `ToastProvider` и `ConfirmDialogProvider`
- `admin/app/layout.tsx` — подключение providers в root layout
- `admin/app/globals.css` — `.glass-card--static`, без wildcard transition
- `admin/components/products/*` — замена alert/confirm, перевод product modals/table/actions на shared UI
- `admin/components/Settings.tsx` — замена alert/confirm, перевод loyalty modal/table/buttons на shared UI
- `admin/components/Orders.tsx` — замена alert/confirm, перевод loading/table/pagination/buttons на shared UI
- `admin/components/PromoCodes.tsx` — замена alert/confirm, перевод loading/table/buttons на shared UI
- `admin/components/Users.tsx` — консолидация pagination/table/spinner
- `admin/components/Dashboard.tsx` — консолидация spinner/button

## Тестирование / Верификация

- `rg -n "alert\\(|confirm\\(" admin -g "*.ts" -g "*.tsx"` → нет совпадений
- `npm run lint` в `admin` → проходит без warnings/errors
- `npm run build` в `admin` → проходит
- `next lint` по-прежнему печатает только legacy follow-up:
  - deprecation notice для `next lint`
  - warning про отсутствие Next ESLint plugin в текущем `.eslintrc.js`
