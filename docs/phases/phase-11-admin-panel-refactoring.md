# Phase 11: Admin Panel Refactoring

> [Корневой документ wiki](../README.md)

## Цель

Привести монолитную SPA-админку к поддерживаемому состоянию: строгая типизация, декомпозиция God-компонентов, единый UI-слой, централизованный auth, маршрутизация через App Router.

## Результат

- Все API-вызовы и state типизированы — `any` устранён из `api.ts` и `useState`.
- `Products.tsx` (1300+ строк) декомпозирован в фокусированные файлы.
- Общие UI-примитивы (`Button`, `Modal`, `Table`, `Toast`, `ConfirmDialog`) заменяют дублированный код и `alert()`/`confirm()`.
- Auth-логика вынесена из `page.tsx` в `AuthProvider` + `AuthGuard` с явным auth contract.
- Навигация через App Router routes с route-level boundaries (`loading.tsx` / `error.tsx`) и page-level error/loading states в client-компонентах.
- Фильтры и пагинация в URL search params — state сохраняется при навигации.
- ESLint настроен и проходит без warnings.

## Оценка

- Размер фазы: `large`
- Ожидаемое число шагов: 7
- Основные риски:
  - Потеря component state при переходе от tab-switching к route navigation (митигация: URL search params)
  - Регрессии в Products при декомпозиции (митигация: re-export, `npm run build` gate)
  - Auth regression при выносе inline-логики (митигация: client-side only, явный auth contract)
  - Redirect loops при 401 (митигация: auth state machine `unknown → authenticated → unauthenticated`)

## Зависит от

- [phase-3-admin-auth-and-api-security.md](./phase-3-admin-auth-and-api-security.md) — JWT guards на backend работают, admin TTL = 24h
- [phase-6-admin-orders-analytics-and-reporting.md](./phase-6-admin-orders-analytics-and-reporting.md) — orders table доработана

## Пререквизиты

- Backend auth endpoints (`POST /auth/login`, JWT admin guard) работают и протестированы.
- Admin JWT TTL = 24h (подтверждено `auth.service.ts:49`).
- Admin panel запускается локально через `npm run dev` без ошибок.
- `shared/types.ts` содержит базовые entity-интерфейсы (будут расширены в шаге 1).

## Scope маршрутов

Полный перечень текущих навигационных разделов (`admin/app/page.tsx:51-59`):

| Раздел | Текущий status | Phase 11 решение |
|---|---|---|
| `dashboard` | Работает | → `(admin)/dashboard/page.tsx` |
| `orders` | Работает | → `(admin)/orders/page.tsx` |
| `users` | Работает | → `(admin)/users/page.tsx` |
| `products` | Работает | → `(admin)/products/page.tsx` |
| `promo` | Работает | → `(admin)/promo/page.tsx` |
| `payments` | Заглушка ("в разработке") | → `(admin)/payments/page.tsx` (placeholder) |
| `analytics` | Заглушка ("в разработке") | → `(admin)/analytics/page.tsx` (placeholder) |
| `settings` | Работает | → `(admin)/settings/page.tsx` |

> `payments` и `analytics` сохраняются в sidebar как placeholder-страницы для навигационной целостности. Функциональность не добавляется в этой фазе.

**Placeholder pages contract (`payments`, `analytics`):**
- Реализуются как минимальные route pages без data fetch и без mutation logic.
- По умолчанию остаются **Server Components**; `'use client'` не добавляется, пока страница остаётся статической заглушкой.
- Используют общий `(admin)/layout.tsx` shell: sidebar, header, auth guard и общие metadata/layout-правила без специальных исключений.
- Контент заглушки user-visible и единообразный: заголовок раздела + краткий текст `В разработке`/`Функциональность будет добавлена в следующих фазах`.
- Страницы участвуют в обычном active state sidebar через pathname, как и рабочие разделы.
- Отдельные `loading.tsx`, `error.tsx`, page-level fetch states или search params для этих страниц в рамках Phase 11 не требуются.
- При появлении реального fetch/mutation в будущих фазах страницы обязаны перейти на тот же контракт, что и остальные admin routes: page-level loading/error/empty states, типизированные данные и явный URL/search params contract при необходимости.

## Auth Contract

Источник истины сессии: JWT в `localStorage('auth_token')`, Bearer header через Axios interceptor.

**Public auth API:**
- `auth.ts` — low-level access к token storage: `AUTH_TOKEN_KEY`, `getToken()`, `setToken()`, `clearToken()`. Ни один page/layout/component не работает с `localStorage` напрямую.
- `AuthProvider` — единственный владелец auth state и публичных auth actions через context: `{ status, login, logout }`.
- `login(email, password, returnUrl?)`:
  - вызывает `authApi.login()`;
  - сохраняет token через `setToken()`;
  - переводит status в `authenticated`;
  - возвращает нормализованный post-login path: `returnUrl` если он валиден, иначе `/dashboard`.
- `logout()`:
  - вызывает `clearToken()`;
  - переводит status в `unauthenticated`;
  - не делает `window.location.reload()`;
  - не содержит inline sidebar/page-specific logic.
- `AuthGuard` — единственный владелец auth redirect для protected routes.
- `login/page.tsx` — единственный владелец redirect после успешного login и redirect для уже authenticated пользователя на публичном login route.
- Sidebar/Header shell вызывает только `logout()` из context и не содержит прямой работы с token storage.

**`returnUrl` sanitization contract:**
- Допустимы только внутренние относительные пути admin-приложения, начинающиеся с `/`.
- Значения вида `https://...`, `http://...`, `//host`, `javascript:...` и любые другие absolute/protocol-based URL запрещены.
- Пустое значение, отсутствующий query param или невалидный `returnUrl` нормализуется к `/dashboard`.
- `returnUrl` может включать `search params` и hash только если базовый путь остаётся внутренним относительным (`/products?country=RU`, `/settings?tab=loyalty`).
- Нормализация выполняется до любого `router.push()` и используется одинаково в `login/page.tsx` и `AuthGuard`.
- Источник истины для этой логики — helper в `auth.ts` или соседнем auth utility модуле; inline sanitization в page/layout/component запрещена.

**State machine:**
```
┌──────────┐     getToken()      ┌───────────────┐
│ unknown  │ ──── exists? ─────→ │ authenticated │
│ (mount)  │                     └───────┬───────┘
└────┬─────┘                             │
     │ no token                    401 response
     ▼                                   │
┌────────────────┐                       │
│ unauthenticated│ ◄─────────────────────┘
│                │      clearToken() + event dispatch
└───────┬────────┘
        │ AuthGuard: router.push('/login?returnUrl=...')
        ▼
```

- **Initial mount:** AuthProvider проверяет `getToken()`. Если token есть → `authenticated` (optimistic authenticated: наличие token достаточно для входа в protected shell до первого API-ответа). Если нет → `unauthenticated`.
- **Во время `unknown`:** AuthGuard показывает `<Spinner />`, не контент и не login form.
- **При `unauthenticated`:** AuthGuard выполняет `router.push('/login?returnUrl=<current_path>')`. AuthProvider **не делает redirect** — только управляет state.
- **При 401:** Axios interceptor вызывает `clearToken()` + dispatch event `'auth:logout'`. AuthProvider слушает event → переводит status в `unauthenticated`. AuthGuard реагирует на изменение status → redirect.
- **Протухший/битый token:** отдельный `/auth/me` probe на mount не обязателен в рамках этой фазы. Невалидный token обнаруживается первым защищённым API-запросом: backend возвращает `401`, interceptor очищает token и отправляет `'auth:logout'`, после чего redirect выполняет AuthGuard.
- **После login:** `login/page.tsx` вызывает `login(email, password, returnUrl)` из context и выполняет redirect на возвращённый нормализованный path. Default = `/dashboard`.
- **Logout из protected shell:** button/menu action вызывает `logout()` из context; дальнейший redirect на `/login?returnUrl=<current_path>` выполняет AuthGuard после смены status. В `returnUrl` передаётся только санитизированный внутренний path текущего route.
- **Redirect policy:** НЕ используем `window.location.reload()`. Redirect — только через AuthGuard.
- **`middleware.ts`:** НЕ создаём. Edge Runtime не имеет доступа к `localStorage`.

> **Принцип единого владельца:** AuthProvider = state management + auth actions. AuthGuard = protected-route render + redirect. `login/page.tsx` = post-login/public-route redirect. Interceptor = token cleanup + event dispatch. Sidebar/header и остальные страницы не работают с token storage и не вызывают auth redirect напрямую.

## Rendering Strategy

> В рамках Phase 11 admin остаётся **client-first SPA** поверх App Router.

- Все page-компоненты помечаются `'use client'`.
- Server Components используются только для layouts (metadata, static shell).
- Граница `'use client'` проходит на уровне `page.tsx` каждого route.
- Server Actions и server-side data fetching не внедряются в этой фазе.
- Перевод на Server Components — отдельная будущая фаза.

### Providers boundary

- `admin/app/layout.tsx` остаётся **Server Component**: содержит `<html>`, `<body>`, root metadata и server-side layout shell. `layout.tsx` **не** получает `'use client'`.
- `AuthProvider` является **Client Component**, потому что работает с `localStorage`, browser events и client auth state.
- `ToastProvider` также подключается через client boundary и не переводит root layout в client mode.
- Для client-only providers создаётся отдельный wrapper, например `admin/app/providers.tsx`, с `'use client'`, внутри которого монтируются `AuthProvider` и `ToastProvider`.
- Root layout импортирует client wrapper как дочерний компонент: server layout с metadata снаружи, client providers внутри.
- `AuthGuard` остаётся client component и используется только внутри client subtree под `AuthProvider`.
- Запрещено помечать весь `admin/app/layout.tsx` как `'use client'` только ради auth/toast wiring: это ломает server metadata boundary и размывает архитектуру App Router.

### Последствия для loading/error boundaries

Поскольку data fetching выполняется **внутри client-компонентов** (`useEffect` + axios), а не через server-side `async function`:

- `(admin)/loading.tsx` — показывается **только при route transition** (lazy import segment), а не при client-side fetch.
- `(admin)/error.tsx` — ловит **только render-time ошибки** (throw в render), а не ошибки из event handlers и async fetch.

Поэтому каждый page-level client-компонент (`Dashboard`, `Orders`, `Products`, `Users`, `Settings`, `PromoCodes`) **обязан** реализовать собственные:
- **loading state:** спиннер/skeleton во время `useEffect` fetch (уже частично есть в текущем коде);
- **error state:** user-visible сообщение + retry action при failed fetch (заменяет текущие `console.error`-only обработчики);
- **empty state:** сообщение при пустых данных (вместо пустой таблицы).

Route-level `loading.tsx`/`error.tsx` остаются как safety net для route transitions и неожиданных render errors.

### Page-level state matrix

| Route | Loading | Error | Empty | Special rule |
|---|---|---|---|---|
| `dashboard` | spinner/skeleton карточек и recent orders | user-visible error + retry | empty state для recent orders | запрещён silent fallback к нулевым метрикам после failed fetch |
| `orders` | spinner/skeleton таблицы | user-visible error + retry | `Заказы не найдены` | failed export показывает toast/error message, но не переводит страницу в fatal state |
| `users` | spinner/skeleton таблицы | user-visible error + retry | `Пользователи не найдены` | retry повторно вызывает loader списка |
| `products` | spinner/skeleton таблицы | user-visible error + retry | `Продукты не найдены` | mutation errors (`create/update/sync/bulk`) показываются через toast/dialog, а не через route error boundary |
| `promo` | spinner/skeleton списка/таблицы | user-visible error + retry | `Нет промокодов` | create/delete/toggle ошибки не скрывают уже загруженный список |
| `settings` | spinner при initial load и при загрузке данных текущей вкладки | user-visible error + retry для текущей вкладки | empty state допустим для loyalty levels | переключение `tab` не должно оставлять бесконечный spinner при failed fetch |
| `payments` | placeholder | не требуется, пока страница без fetch | placeholder | при появлении fetch в будущих фазах страница обязана перейти на тот же контракт |
| `analytics` | placeholder | не требуется, пока страница без fetch | placeholder | при появлении fetch в будущих фазах страница обязана перейти на тот же контракт |

### Error handling contract

- **Fetch errors:** показываются внутри page-level компонента как error state с user-visible текстом и `Retry` action.
- **Mutation errors:** (`create/update/cancel/toggle/export`) не переводят всю страницу в fatal error state; ошибка показывается через toast, confirm dialog message или inline action message, а уже загруженные данные остаются видимыми.
- **Retry semantics:** retry повторно вызывает тот же loader, который выполнялся на initial fetch.
- **State exclusivity:** empty state показывается только после успешного fetch с пустыми данными; error state и empty state взаимоисключающие.
- **Route-level `error.tsx` scope:** boundary ловит только render-time exceptions и route/segment load failures (например, ошибка при рендере client tree, lazy import failure, unexpected throw в render path). Обычные async ошибки из `useEffect`, event handlers, submit handlers и mutation callbacks не должны пробрасываться в route boundary.
- **No fetch-to-boundary promotion:** initial data loaders в client components не используют `throw` в render как способ показать network/API ошибку; такие ошибки переводятся в page-level error state по матрице выше.
- **Reset semantics:** `reset()` в route-level `error.tsx` используется только как retry для route re-render / segment reload после render-time failure. Он не заменяет page-level `Retry` для обычных API/fetch ошибок.
- **Post-mutation refresh policy:** после успешной mutation допускается локальное обновление state или точечный refetch затронутого набора данных. Полный повтор initial page loader разрешён только если без него нельзя надёжно синхронизировать UI с backend response.
- **No unnecessary full reloads:** успешные `create/update/toggle/delete/bulk` операции не должны по умолчанию переводить страницу обратно в глобальный loading spinner и заново загружать весь screen, если можно обновить уже видимый список локально или через targeted reload.
- **Preserve route state:** post-mutation refresh не должен сбрасывать текущие search params, pagination, active tab, selected filters и URL-derived state.
- **UX continuity:** уже загруженные данные остаются видимыми во время post-mutation sync; допустимы action-level pending states, disabled buttons и inline row updates вместо полного скрытия таблицы.
- **Anti-patterns:** запрещены бесконечный spinner после failed fetch, `console.error` как единственный user-facing handling и silent fallback к fake-zero данным на `Dashboard`.

### Concurrent request policy (`settings` tabs)

- При быстром переключении `pricing` / `referrals` / `loyalty` разрешены параллельно завершившиеся запросы, но UI не должен применять устаревший ответ от предыдущей вкладки к текущему state.
- Source of truth для отображаемых данных — `activeTab` на момент применения ответа, а не на момент старта запроса.
- Каждый tab loader обязан защищаться от stale responses одним из допустимых способов:
  - request id / sequence guard;
  - `AbortController` / axios cancellation;
  - ignore-if-tab-changed check перед `setState`.
- Минимально допустимое поведение в рамках Phase 11: если пользователь ушёл с вкладки до завершения запроса, устаревший ответ игнорируется и не перезаписывает state текущей вкладки.
- `loading` state должен быть привязан к активной вкладке. Завершение старого запроса не должно скрывать spinner новой вкладки и не должно возвращать UI в "loaded" state для неверного tab.
- `error` state также scoped к активной вкладке: ошибка старого запроса не должна подменять контент новой вкладки после переключения.
- `Retry` на `settings` повторяет loader только для текущей активной вкладки.
- Если используется общий `loadData()` dispatcher, он обязан принимать target tab/request token и перед применением результата сверять его с актуальным активным tab.

## URL Search Params Contract

| Route | Params | Default | Invalid value |
|---|---|---|---|
| `/products` | `country`, `active`, `type`, `search`, `unlimited` | все пустые (без фильтров) | игнорируется, fallback на default |
| `/orders` | `status`, `sortBy`, `sortOrder`, `page` | `page=1`, no filter | `page` < 1 → 1, unknown status → игнорируется |
| `/users` | `page` | `page=1` | `page` < 1 → 1 |
| `/settings` | `tab` | `tab=pricing` | не `pricing`/`referrals`/`loyalty` → `pricing` |

- **Text search (products):** обновление URL с debounce 300ms через `router.replace()`.
- **Остальные фильтры:** мгновенный `router.replace()` без debounce.
- **Нормализация:** невалидные params тихо заменяются на default, не показывают ошибку.

### Products search param update policy

- В рамках Phase 11 `products` остаётся client-side screen с одним initial fetch списка; изменение `search`, `country`, `active`, `type`, `unlimited` не должно по умолчанию запускать новый network request на каждый ввод/клик, если backend server-side filtering специально не вводится отдельной задачей.
- Source of truth для текстового поиска: значение в URL search params после debounce и локальное client state поля ввода до момента синхронизации.
- `search` обновляет URL через debounce 300ms с `router.replace()`; до истечения debounce UI продолжает фильтровать локально по текущему значению input без ожидания URL round-trip.
- Изменение search param не должно приводить к полному reset списка, route-level loading state или повторному initial fetch только из-за синхронизации URL.
- Остальные product filters (`country`, `active`, `type`, `unlimited`) обновляют URL мгновенно через `router.replace()`, но применяются к уже загруженному набору продуктов локально.
- Если в будущей фазе появится backend-driven filtering/search, это должно быть оформлено как отдельное изменение контракта с явным описанием fetch semantics, loading UX и cache strategy.
- Антипаттерн для этой фазы: `useEffect(searchParams)` → повторный `productsApi.getAll()` на каждый ввод символа в search field.

### URL canonicalization policy

- Source of truth для route state — canonical URL после нормализации params.
- Если query param валиден, UI и loaders читают его как есть без дополнительного rewrite.
- Если query param невалиден, page обязана выполнить canonicalization через `router.replace()` на нормализованный URL, а не только silently fallback в памяти.
- Canonicalization выполняется без добавления лишней записи в browser history: используется `router.replace()`, не `router.push()`.
- Canonicalization должна происходить один раз на входе в страницу или при чтении внешне изменённых search params; запрещены циклы `replace()` на каждом render.
- Canonicalization helper должен быть shared на уровне route utilities/hooks; inline-логика нормализации в каждом обработчике фильтра нежелательна.

**Canonical examples:**
- `/orders?page=0` → `replace('/orders?page=1')`
- `/users?page=-5` → `replace('/users?page=1')`
- `/settings?tab=invalid` → `replace('/settings?tab=pricing')`
- `/orders?status=UNKNOWN` → `replace('/orders')` или `replace('/orders?page=1')` в зависимости от выбранного default URL shape для route
- `/products?active=maybe&type=weird` → удалить невалидные фильтры из URL и оставить только валидные params

**Default URL shape rule:**
- Для defaults, влияющих на pagination/tab selection, canonical URL должен быть явным: `page=1` для `/orders` и `/users`, `tab=pricing` для `/settings`.
- Для отсутствующих filters в `/products` допустим чистый URL без query string.
- Для optional filters (`status`, `country`, `search`, `active`, `type`, `unlimited`) canonical form — отсутствие param, а не хранение пустого значения (`?search=`).

### Navigation UX policy

- Переход от tab-switching к route navigation считается допустимым UX-изменением, но не должен создавать неожиданные regressions в scroll/focus behavior.
- Базовое поведение Phase 11: каждый route transition может сбрасывать scroll в начало страницы. Сохранение scroll position между разными route в рамках этой фазы **не требуется**.
- Browser-native history restoration (`back/forward`) допускается как есть; отдельная кастомная система восстановления scroll в этой фазе не внедряется.
- После navigation keyboard focus не должен теряться в неинтерактивной области или оставаться на размонтированном sidebar item.
- Минимальное требование accessibility: после route transition фокус должен оказываться либо на основном заголовке страницы, либо на первом осмысленном интерактивном элементе нового route.
- Для `loading.tsx`, `error.tsx`, login redirect и page-level retry flows запрещены focus traps или потеря таб-навигации после смены route/state.
- Если конкретный route использует search params для pagination/filtering и выполняет `router.replace()`, это не должно неожиданно сбрасывать фокус из активного поля ввода, кроме случаев явного route transition на другую страницу.

### `not-found.tsx` policy

- Специальный `not-found.tsx` для admin routes в рамках Phase 11 **вне scope**.
- Phase 11 не добавляет custom 404 UI для `(admin)` route group и не меняет глобальную стратегию обработки неизвестных путей.
- Достаточно использовать дефолтное Next.js not-found behavior, пока не появится отдельная задача на branded/admin-aware 404 page.
- Если в ходе реализации потребуется explicit handling для несуществующего dynamic segment или custom 404 copy, это должно оформляться как отдельный follow-up, а не как скрытое расширение scope этой фазы.

## Accessibility Policy

Минимальные требования для UI-примитивов:
- **Modal / ConfirmDialog:** focus trap, `Escape` для закрытия, `aria-modal="true"`, `role="dialog"`.
- **Toast:** `aria-live="polite"`, auto-dismiss через 5s, не блокирует interaction.
- **Button (icon-only):** `aria-label` обязателен.
- **Login form:** `aria-describedby` для ошибок, autofocus на email.

## Metadata Policy

- Admin area: `robots: { index: false, follow: false }` в root `layout.tsx`.
- Root metadata: `title: 'Mojo Mobile Admin'`.
- `/login`: `title: 'Вход — Mojo Mobile Admin'`.
- `/login` при `authenticated` status не должен оставаться на login form: страница выполняет client-side redirect на `returnUrl` из query params или на `/dashboard`, если `returnUrl` отсутствует.
- Для admin routes внутри `(admin)` route-specific titles не требуются — достаточно root metadata.

## Re-export Exit Criteria

`Products.tsx` re-export — временный compatibility layer:
- Удаляется в Step 06 (ESLint/cleanup) после подтверждения, что прямые импорты старого пути отсутствуют в коде.
- Проверка: поиск по коду `from.*Products` не возвращает импорты старого пути кроме самого re-export файла.

## Архитектурные решения

- **Auth стратегия:** Client-side only. `AuthProvider` (React Context) + `AuthGuard` в `(admin)/layout.tsx`. Auth state machine описан выше.
- **Маршрутизация:** Route group `(admin)/` с layout (sidebar + auth guard). Login — отдельный route без sidebar. Root route `/` выполняет redirect на `/login`, а не на `/dashboard`, чтобы не создавать лишний redirect-hop для неавторизованных пользователей.
- **State preservation:** Фильтры/пагинация через `useSearchParams()` → URL. Контракт описан выше.
- **Types source of truth:** `admin/lib/types.ts`. Создаётся после inventory API response shapes.
- **Products/Settings API normalization:** `Products` и `Settings` считаются зонами повышенного риска по API-контрактам. Если endpoint возвращает неоднородные wrappers (`response.data`, `response.data.data`, `response.data.products`, mixed `success/message` payloads), нормализация выполняется в typed adapter/helper слое рядом с `api.ts`, а не внутри page-компонентов. `Products`/`Settings` не должны содержать knowledge о backend response inconsistencies в render/load logic.
- **UI-примитивы:** `admin/components/ui/`, с accessibility requirements выше.
- **Products re-export:** Временный, удаляется в Step 06.
- **Rendering strategy:** Client-first, `'use client'` на уровне page, server layouts для metadata.

## Шаги (журналы)

1. [Step 01 — Baseline, API inventory и типизация](./phase-11/step-01-baseline-and-types.md)
2. [Step 02 — Декомпозиция Products.tsx](./phase-11/step-02-products-decomposition.md)
3. [Step 03 — UI-примитивы и замена alert/confirm](./phase-11/step-03-ui-primitives-and-toast.md)
4. [Step 04 — Auth contract и auth-слой](./phase-11/step-04-auth-layer.md)
5. [Step 05 — App Router маршрутизация](./phase-11/step-05-app-router-migration.md)
6. [Step 06 — ESLint и cleanup](./phase-11/step-06-eslint-and-cleanup.md)
7. [Step 07 — Документация](./phase-11/step-07-documentation.md)

## Верификация

- `npm run build` проходит без ошибок после каждого шага.
- После Step 05 анализируется output `next build`: route-level chunks для `dashboard`, `orders`, `users`, `products`, `promo`, `settings`, `login` фиксируются и сравниваются с baseline до App Router migration.
- App Router migration должна подтверждать, что монолитный initial client bundle разбит по route segments; отсутствие route splitting или неожиданный рост initial JS bundle требует отдельного investigation перед закрытием фазы.
- Если один из route chunks (`products`, `dashboard`, `settings`) остаётся аномально тяжёлым, это фиксируется в журнале как performance follow-up с указанием главных импортов/подозреваемых причин, даже если full optimization остаётся вне scope текущей фазы.
- Поиск по коду не возвращает `: any` и `useState<any` в `admin/**/*.{ts,tsx}`.
- Поиск по коду не возвращает `alert(` / `confirm(` в `admin/**/*.{ts,tsx}`.
- Root `/` → redirect на `/login` без промежуточного `/dashboard`.
- Login: email + password → redirect на `/dashboard`.
- Direct URL `/products` без авторизации → redirect на `/login`.
- 401 response → redirect на `/login?returnUrl=...` без `window.location.reload()`.
- После login с `returnUrl` → redirect на сохранённый путь.
- Products: фильтрация по стране → URL обновляется → refresh → фильтр сохранён.
- Orders: сортировка + пагинация → browser back → предыдущая страница.
- Settings: `/settings?tab=loyalty` → открывается Loyalty; `/settings?tab=invalid` → fallback на Pricing.
- Products: CRUD, массовый toggle, массовый бейдж — без регрессий.
- `payments` и `analytics` в sidebar → placeholder-страницы доступны.
- Route-level: `loading.tsx` показывает спиннер при route transition. `error.tsx` ловит render-time ошибки и показывает retry.
- Page-level: каждый client-компонент показывает собственный loading/error/empty state при client-side fetch. Нет бесконечных спиннеров при failed fetch, нет «немых» ошибок только в `console.error`.
- `Products` и `Settings` не читают mixed backend wrappers напрямую в page/render code (`response.data?.data || response.data?.products` и аналогичные паттерны отсутствуют вне typed adapter/helper слоя).
- Для каждого используемого `Products`/`Settings` endpoint зафиксирован единый typed contract между `api.ts`/adapter слоем и page-компонентом.
- `npm run lint` проходит через ESLint CLI без warnings и errors.

## Журнал

### 2026-05-11

- Фаза создана на основе аудита implementation plan.
- Аудит выявил 2 критических и 6 потенциальных проблем; все решены.
- Внешний аудит (см. `docs/audits/audit.md`) выявил 15 дополнительных замечаний; все интегрированы:
  - Добавлен scope маршрутов с `payments`/`analytics` как placeholder.
  - Добавлен auth contract (state machine, 401 policy, returnUrl).
  - Добавлена rendering strategy (client-first, `'use client'` boundary).
  - `loading.tsx` / `error.tsx` добавлены в Step 05.
  - Verification переписана в platform-neutral виде.
  - Step 01 разделён на API inventory + типизацию.
  - Добавлены accessibility, metadata и URL params policies.
  - Re-export exit criteria зафиксированы.
  - Убраны абсолютные пути на `.gemini`.
  - JWT TTL зафиксирован как 24h (по auth.service.ts:49).

## Ссылки

- [Корневой документ wiki](../README.md)
- [Внешний аудит](../audits/audit.md)
- [Phase 3 — Admin Auth](./phase-3-admin-auth-and-api-security.md)
- [Phase 6 — Admin Orders](./phase-6-admin-orders-analytics-and-reporting.md)
