# Step 04 — Auth contract и auth-слой

> [⬅️ Phase 11](../phase-11-admin-panel-refactoring.md)

## Цель

Создать auth-слой как самостоятельные модули (`auth.ts`, `AuthProvider`, `AuthGuard`) и модифицировать interceptors в `api.ts`. Интеграция в layouts — в Step 05 (при создании route structure).

## Что нужно сделать

### 4.1 Auth contract (зафиксировать до кода)

Auth state machine:
```
unknown (mount) ──── token exists? ─→ authenticated
   │ no token                              │ 401 response
   ▼                                       ▼
unauthenticated ←──────────────────────────┘
   │                    clearToken() + event dispatch
   │ AuthGuard: router.push('/login?returnUrl=...')
   ▼
```

Правила:
- Источник истины: JWT в `localStorage('auth_token')`.
- `unknown` → AuthGuard показывает `<Spinner />`, не контент и не login.
- При initial mount наличие token переводит состояние в `authenticated` **optimistically**: отдельный `/auth/me` probe для валидации token на mount не требуется в рамках этой фазы.
- `authenticated` → AuthGuard показывает `{children}`.
- `unauthenticated` → AuthGuard выполняет `router.push('/login?returnUrl=<current_path>')`. **AuthProvider не делает redirect.**
- Login route при `authenticated` status не показывает login form повторно: выполняется redirect на `returnUrl` из query params или на `/dashboard` по умолчанию.
- После login → redirect на `returnUrl` из query params, default = `/dashboard`.
- 401 → interceptor вызывает `clearToken()` + dispatch event `'auth:logout'`. AuthProvider слушает event → переводит status в `unauthenticated`. AuthGuard реагирует на изменение status → redirect.
- Протухший/битый token обнаруживается первым защищённым API-запросом. После `401` приложение обязано очистить token и перевести пользователя в `unauthenticated` без `window.location.reload()`.
- **НЕТ** `window.location.reload()`. **НЕТ** `middleware.ts`.

> **Принцип единого владельца:** AuthProvider = state management. AuthGuard = render + redirect. Interceptor = token cleanup + event dispatch.

### 4.2 Реализация

1. Создать `admin/lib/auth.ts`:
   - `AUTH_TOKEN_KEY`, `getToken()`, `setToken()`, `clearToken()`, `isAuthenticated()`
2. Создать `admin/components/AuthProvider.tsx`:
   - React Context: `{ status: 'unknown'|'authenticated'|'unauthenticated', admin, login(), logout() }`
   - При mount: проверить `getToken()` → set status. **Не делает redirect.**
   - Подписка на event `'auth:logout'` → перевод status в `unauthenticated`
3. Создать `admin/components/AuthGuard.tsx`:
   - **Единственный владелец auth redirect:**
   - `status === 'unknown'` → `<Spinner />`
   - `status === 'unauthenticated'` → `router.push('/login?returnUrl=...')`
   - `status === 'authenticated'` → `{children}`
4. Модифицировать `api.ts`:
   - Request interceptor: `getToken()` из `auth.ts`
   - Response interceptor (401): `clearToken()` + dispatch custom event `'auth:logout'`
   - **НЕ** redirect напрямую из interceptor — он только чистит токен и отправляет event

> **Важно:** `admin/app/page.tsx` НЕ модифицируется на этом шаге. Монолитный файл будет заменён в Step 05 при создании route structure. AuthProvider и AuthGuard подключаются сразу в новые layouts (root layout и `(admin)/layout.tsx`) в Step 05.

## Результат шага

- Auth-слой в 3 файлах: `auth.ts`, `AuthProvider.tsx`, `AuthGuard.tsx` — готовы к интеграции.
- `api.ts` interceptors используют `getToken()`/`clearToken()` из `auth.ts` + dispatch `'auth:logout'` event.
- 401 не вызывает `window.location.reload()` — interceptor только чистит токен и отправляет event.
- `npm run build` проходит (новые файлы ещё не подключены в layout, но компилируются).
- Интеграция AuthProvider/AuthGuard в layouts — Step 05.

## Зависимости

- Step 01 (типы).
- Step 03 (Spinner для loading state).

## Статус

`planned`

## Файлы

- `admin/lib/auth.ts` — [NEW]
- `admin/components/AuthProvider.tsx` — [NEW]
- `admin/components/AuthGuard.tsx` — [NEW]
- `admin/lib/api.ts` — рефакторинг interceptors

## Тестирование / Верификация

- `npm run build` проходит (новые модули компилируются без ошибок).
- `auth.ts`: `getToken()` / `setToken()` / `clearToken()` работают с localStorage.
- `api.ts`: 401 response → `clearToken()` + dispatch `'auth:logout'` event (без `window.location.reload()`).
- `api.ts`: request interceptor подставляет Bearer token из `getToken()`.
- AuthProvider / AuthGuard: unit-level проверка логики (smoke test после подключения в Step 05).
- **Полный auth smoke (login, logout, 401 redirect, flicker) — в Step 05** после интеграции в layouts.
