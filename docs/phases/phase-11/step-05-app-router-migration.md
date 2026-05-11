# Step 05 — App Router маршрутизация

> [⬅️ Phase 11](../phase-11-admin-panel-refactoring.md)

## Цель

Перевести монолитную tab-навигацию на App Router routes с boundaries, metadata, placeholder pages и URL search params.

## Что нужно сделать

### 5.1 Route structure
```
app/
├── layout.tsx                 ← Root: <html>, fonts, AuthProvider, ToastProvider
│                                metadata: title 'Mojo Mobile Admin'
│                                robots: { index: false, follow: false }
├── page.tsx                   ← redirect('/login')
├── (admin)/
│   ├── layout.tsx             ← AuthGuard + Sidebar + Header + Logout
│   ├── loading.tsx            ← Route-level spinner
│   ├── error.tsx              ← Error boundary с retry + user-visible message
│   ├── dashboard/page.tsx     ← 'use client'; <Dashboard />
│   ├── orders/page.tsx        ← 'use client'; <Orders />
│   ├── users/page.tsx         ← 'use client'; <Users />
│   ├── products/page.tsx      ← 'use client'; <Products />
│   ├── promo/page.tsx         ← 'use client'; <PromoCodes />
│   ├── payments/page.tsx      ← placeholder "Платежи — в разработке"
│   ├── analytics/page.tsx     ← placeholder "Аналитика — в разработке"
│   └── settings/page.tsx      ← 'use client'; <Settings />
└── login/
    ├── page.tsx               ← Login form (без sidebar)
    │                            metadata: title 'Вход — Mojo Mobile Admin'
    └── loading.tsx            ← Minimal spinner
```

### 5.2 Rendering strategy
- Все page-компоненты: `'use client'`
- Layouts: Server Components (metadata, static shell)
- Граница `'use client'`: на уровне `page.tsx`
- Server Actions / server data fetching: не в scope Phase 11

### 5.3 Sidebar
- Вынести sidebar из `page.tsx` в `(admin)/layout.tsx`
- Navigation: `<Link href="/products">` вместо `setActiveTab()`
- Active state: `usePathname()` вместо `activeTab === 'products'`
- Полный набор: dashboard, orders, users, products, promo, payments, analytics, settings

### 5.4 URL search params

По контракту из Phase 11 doc:

| Route | Params | Default | Invalid |
|---|---|---|---|
| `/products` | `country`, `active`, `type`, `search`, `unlimited` | все пустые | игнорируется |
| `/orders` | `status`, `sortBy`, `sortOrder`, `page` | `page=1` | `page<1` → 1 |
| `/users` | `page` | `page=1` | `page<1` → 1 |
| `/settings` | `tab` | `pricing` | не pricing/referrals/loyalty → pricing |

Реализация:
- `useSearchParams()` + `router.replace()` для обновления
- **Text search (products):** debounce 300ms перед `router.replace()`
- Остальные фильтры: мгновенный replace
- Невалидные params → тихая нормализация к default

### 5.5 loading.tsx / error.tsx

**Route-level (safety net):**
- `(admin)/loading.tsx` — центрированный `<Spinner />`. Показывается **только при route transition** (lazy import segment), не при client-side fetch.
- `(admin)/error.tsx` — ловит **только render-time ошибки** (throw в render). User-visible сообщение + кнопка "Повторить" (`reset()`). Не ловит ошибки из event handlers и async client fetch.
- `login/loading.tsx` — минимальный spinner.

**Page-level (обязательно в каждом client-компоненте):**
Поскольку data fetching выполняется через `useEffect` + axios внутри `'use client'` компонентов, route-level boundaries на это не срабатывают. Каждый компонент обязан реализовать:
- **loading state:** спиннер/skeleton во время fetch (уже частично есть);
- **error state:** user-visible сообщение + кнопка "Повторить" (заменяет `console.error`-only);
- **empty state:** сообщение при пустых данных.

**Fetch vs mutation policy:**
- Ошибки initial/page fetch показываются как page-level error state с retry.
- Ошибки мутаций (`create/update/cancel/toggle/export`) не должны переводить всю страницу в fatal state: они показываются через toast, confirm dialog message или inline action message.
- Уже загруженные данные должны оставаться видимыми после mutation error.

**Обязательный scope компонентов:**
- `admin/components/Dashboard.tsx`
- `admin/components/Orders.tsx`
- `admin/components/Users.tsx`
- `admin/components/Products.tsx` или `admin/components/products/ProductsPage.tsx`
- `admin/components/PromoCodes.tsx`
- `admin/components/Settings.tsx`

**Special rules by page:**
- `Dashboard`: failed analytics/dashboard fetch не маскируется нулевыми значениями; вместо fake-zero UI показывается error state.
- `Orders`: failed export показывает action-level error, но не ломает уже загруженную таблицу.
- `Products`: failed bulk/sync/create/update action показывает toast/dialog error, таблица остаётся доступной.
- `Settings`: failed load текущей вкладки показывает error state для этой вкладки; retry повторяет её загрузку.

Запрещено: бесконечный спиннер при failed fetch, "немые" ошибки только в console.log, silent fallback к fake-zero данным на `Dashboard`.

### 5.6 Login page
- Отдельный route без sidebar (не в `(admin)` layout)
- Читает `returnUrl` из query params → после login → redirect
- Если пользователь уже `authenticated`, login page не показывает форму повторно и делает client-side redirect на `returnUrl` или `/dashboard`
- Metadata: `title: 'Вход — Mojo Mobile Admin'`
- `aria-describedby` для validation errors, autofocus на email

### 5.7 Root page.tsx
- `redirect('/login')` — удалить старый монолитный код и не создавать лишний redirect-hop `/ -> /dashboard -> /login` для неавторизованных пользователей

## Результат шага

- Каждый раздел — отдельный route.
- `payments` и `analytics` — placeholder pages в sidebar.
- Sidebar в layout с active state через pathname.
- Фильтры в URL — refresh восстанавливает state.
- Login — отдельная страница с `returnUrl`.
- **Auth интеграция:** AuthProvider в root `layout.tsx`, AuthGuard в `(admin)/layout.tsx`. Монолитный `page.tsx` с inline auth удалён.
- `loading.tsx` и `error.tsx` работают на route-level (route transition + render errors).
- Каждый client-компонент показывает собственный loading/error/empty state при client-side fetch.

## Зависимости

- Step 02 (Products декомпозирован).
- Step 03 (ToastProvider, Spinner).
- Step 04 (AuthProvider + AuthGuard).

## Статус

`completed`

## Файлы

- `admin/app/layout.tsx` — root layout с metadata, providers
- `admin/app/page.tsx` — redirect
- `admin/app/(admin)/layout.tsx` — [NEW] admin layout
- `admin/app/(admin)/loading.tsx` — [NEW]
- `admin/app/(admin)/error.tsx` — [NEW]
- `admin/app/(admin)/dashboard/page.tsx` — [NEW]
- `admin/app/(admin)/orders/page.tsx` — [NEW]
- `admin/app/(admin)/users/page.tsx` — [NEW]
- `admin/app/(admin)/products/page.tsx` — [NEW]
- `admin/app/(admin)/promo/page.tsx` — [NEW]
- `admin/app/(admin)/payments/page.tsx` — [NEW] placeholder
- `admin/app/(admin)/analytics/page.tsx` — [NEW] placeholder
- `admin/app/(admin)/settings/page.tsx` — [NEW]
- `admin/app/login/page.tsx` — [NEW]
- `admin/app/login/loading.tsx` — [NEW]
- `admin/app/login/layout.tsx` — metadata для login route
- `admin/components/AdminShell.tsx` — [NEW] client shell для sidebar/header/logout/focus
- `admin/components/LoginPage.tsx` — [NEW] login form с `returnUrl`

## Тестирование / Верификация

- `npm run build` в `admin` → проходит
- `npm run lint` в `admin` → проходит без warnings/errors
- Build output подтверждает route splitting:
  - `/dashboard` → `4.53 kB`
  - `/orders` → `7.83 kB`
  - `/products` → `10.4 kB`
  - `/promo` → `3.13 kB`
  - `/settings` → `5.34 kB`
  - `/users` → `4.58 kB`
  - `/login` → `3.31 kB`
  - `/payments`, `/analytics` → placeholder routes
- Root `/` теперь отдельный redirect route на `/login`
- `(admin)` route group содержит shell, `loading.tsx`, `error.tsx`, protected pages и placeholder pages
- `Orders`, `Users`, `Settings`, `Products` читают route state из search params и canonicalize URL через `router.replace()`
- `Products` text search синхронизируется в URL через debounce `300ms`
- `Dashboard`, `Orders`, `Users`, `PromoCodes`, `Settings` показывают page-level error state с retry вместо silent fallback / бесконечного spinner
- `next lint` по-прежнему печатает только legacy follow-up:
  - deprecation notice для `next lint`
  - warning про отсутствие Next ESLint plugin в текущем `.eslintrc.js`
