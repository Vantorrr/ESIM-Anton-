# Step 04 — Auth унификация

> [⬅️ Назад к Phase 12](../phase-12-client-refactoring.md)

## Цель

Устранить дублирование auth-логики на страницах. Единый `useAuth()` из `AuthProvider` — source of truth. При этом сохранить все Telegram Mini App специфичные behaviors.

## Контекст: два auth flow

Приложение работает в двух средах с разными auth flow:

| Среда | Auth flow | Redirect policy |
|-------|-----------|----------------|
| **Telegram Mini App** | `initData` → `POST /auth/telegram/webapp` → JWT | Redirect на `/login` **не нужен** — пользователь уже авторизован через Telegram |
| **PWA / Browser** | Email/OTP или OAuth → JWT в localStorage | Redirect на `/login` при отсутствии token |

`AuthProvider` уже корректно обрабатывает оба flow:
- Telegram: ждёт SDK (max 2s), отправляет `initData` на backend, получает JWT
- PWA: восстанавливает token из localStorage, верифицирует через `/auth/me`
- Предоставляет `isTelegram` и `authError` для UI-решений на страницах

### Telegram-specific UI поведение (НЕ трогаем)

Следующие паттерны — это **не auth дублирование**, а Telegram-specific UI, которое **остаётся**:

| Файл | Паттерн | Зачем |
|------|---------|-------|
| `product/[id]:265` | `Telegram.WebApp.showAlert()` | Нативный TG alert вместо browser alert |
| `product/[id]:173` | `isTelegramWebApp() ? Telegram.WebApp : null` | HapticFeedback при покупке |
| `profile:175-177` | `if (isTelegramWebApp()) alert('выход не требуется')` | В TG logout невозможен |
| `referrals:50,62` | `Telegram.WebApp` | Share через TG + invite link |
| `order/[id]:196` | `Telegram.WebApp` | Share чека |
| `loyalty:26` | `if (!isTelegram) router.push('/login')` | В TG не redirect на login |
| `referrals:21` | `if (!isTelegram) router.push('/login')` | Аналогично |

> Эти паттерны корректны. Telegram Mini App имеет свой UX контракт (нативные алерты, share, haptic feedback). Рефакторинг: `(window as any).Telegram` → типизация через `types/telegram.d.ts` (Step 05).

## Что нужно сделать

### 4.1 Инвентаризация текущего состояния

Большинство страниц **уже используют `useAuth()`**:

| Страница | Использует `useAuth()` | Дублирует inline auth |
|----------|----------------------|----------------------|
| `profile/page.tsx` | ✅ `useAuth()` L:30 | ⚠️ inline `import('@/lib/auth')` для logout L:175 + inline `/auth/me` fallback L:75-93 |
| `product/[id]/page.tsx` | ✅ `useAuth()` L:27 | 🔴 inline `/auth/me` fallback в `handlePurchase` L:145-158 |
| `orders/page.tsx` | ✅ `useAuth()` L:28 | 🔴 inline `/auth/me` fallback L:36-46 + `setOrders(userOrders as any)` L:51 |
| `my-esim/page.tsx` | ✅ `useAuth()` L:231 | 🔴 inline `/auth/me` fallback L:239-250 |
| `balance/page.tsx` | ✅ `useAuth()` L:58 | 🔴 inline `/auth/me` fallback L:82-91 + **нет auth guard** (молча показывает пустой баланс) |
| `topup/[orderId]/page.tsx` | ✅ `useAuth()` L:29 | ✅ Нет дублирования |
| `loyalty/page.tsx` | ✅ `useAuth()` L:18 | ✅ TG-aware redirect, образцовый паттерн |
| `referrals/page.tsx` | ✅ `useAuth()` L:12 | ✅ TG-aware redirect, образцовый паттерн |
| `login/page.tsx` | ❌ Прямой `lib/auth` | ✅ Корректно: login page — единственное место для прямого token management |

**Вывод:** 5 страниц содержат inline `/auth/me` fallback, который дублирует `AuthProvider`. Это нужно удалить.

### 4.2 Привести logout в profile к `useAuth().logout()`

В `profile/page.tsx:170-182`:
```ts
// Было:
const handleLogout = async () => {
  const { isTelegramWebApp, clearToken } = await import('@/lib/auth')
  if (isTelegramWebApp()) {
    alert('В Telegram Mini App выход не требуется...')
    return
  }
  clearToken()
  window.location.href = '/login'
}

// Стало:
const handleLogout = () => {
  if (isTelegram) {  // из useAuth()
    showToast('В Telegram Mini App выход не требуется', 'info')  // Step 05
    return
  }
  logout()  // из useAuth()
  router.push('/login')  // из Step 02
}
```

### 4.2 Удалить inline `/auth/me` fallback из 5 страниц

Во всех перечисленных страницах есть одинаковый паттерн — "если нет `authUser`, делаем свой fetch":

```ts
// УДАЛИТЬ этот блок (встречается в 5 файлах):
if (!userId) {
  const { getToken } = await import('@/lib/auth')
  const token = getToken()
  if (token) {
    const { api } = await import('@/lib/api')
    const { data } = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    userId = data.id
  } else {
    window.location.href = '/login'  // или router.push после Step 02
    return
  }
}
```

**Заменить на:** Использовать `authUser` из `useAuth()` напрямую. Если `!authUser && !authLoading` — это значит пользователь не авторизован, обработать через auth guard (см. 4.3).

> ⚠️ **После Step 03** auth-логика в `product/[id]` может оказаться в child-компоненте (`PurchaseFlow.tsx`), а не в `page.tsx`. Проверять декомпозированные файлы.

Файлы для обработки:
- `app/profile/page.tsx` L:74-93 — fallback + logout L:174-182
- `app/product/[id]/page.tsx` L:145-158 — fallback в `handlePurchase`
- `app/orders/page.tsx` L:36-46 — fallback + `as any` L:51
- `app/my-esim/page.tsx` L:239-250 — fallback
- `app/balance/page.tsx` L:82-91 — fallback (без redirect, молча показывает пустую страницу)

### 4.3 Добавить TG-aware auth guard

Страницы, которые redirect на `/login` при отсутствии auth, должны **не делать redirect в Telegram Mini App**:

- `profile/page.tsx` — при `isTelegram && !user` → показать TG auth error, не redirect
- `orders/page.tsx` — аналогично
- `my-esim/page.tsx` — аналогично
- `balance/page.tsx` — **сейчас вообще нет guard**, показывает пустой баланс. Добавить auth guard.

Паттерн из `loyalty/page.tsx` (уже корректный):
```ts
if (!isTelegram) {
  router.push('/login')
}
```

Применить этот паттерн ко всем страницам с auth guard.

### 4.4 Убедиться, что axios interceptor не конфликтует

`lib/api.ts` содержит axios interceptor для Bearer header. Страницы не должны дублировать header вручную.

Проверить: после унификации auth, API-запросы по-прежнему авторизованы через interceptor в обеих средах (TG + PWA).

## Результат шага

- Inline `/auth/me` fallback удалён из 5 страниц (`profile`, `product/[id]`, `orders`, `my-esim`, `balance`).
- `profile/page.tsx` использует `useAuth().logout()` вместо inline `import('@/lib/auth')`.
- `balance/page.tsx` имеет auth guard (ранее молча показывал пустую страницу).
- Auth redirect на `/login` выполняется только в PWA/Browser, не в Telegram Mini App.
- Telegram-specific UI поведение (showAlert, share, haptic) — сохранено без изменений.
- `login/page.tsx` — остаётся единственным местом с прямым token management.
- Нет `import('@/lib/auth')` и `api.get('/auth/me')` в page-компонентах (кроме `login`).

## Зависимости

- Step 02 — `window.location` уже заменён на `router.push`.
- Step 03 — god-pages декомпозированы, auth-логика локализована в конкретных компонентах.

## Статус

`planned`

## Файлы

- `client/app/profile/page.tsx` (или `components/`) — удалить inline auth fallback + унификация logout
- `client/app/product/[id]/page.tsx` (или `components/PurchaseFlow.tsx` после Step 03) — удалить inline auth fallback в `handlePurchase`
- `client/app/orders/page.tsx` — удалить inline auth fallback + `as any` + добавить TG-aware auth guard
- `client/app/my-esim/page.tsx` — удалить inline auth fallback + добавить TG-aware auth guard
- `client/app/balance/page.tsx` — удалить inline auth fallback + **добавить auth guard** (сейчас нет)

## Тестирование / Верификация

- `tsc --noEmit` — 0 ошибок.
- `next build` — exit code 0.
- **Telegram Mini App flow:**
  - Вход через бота → AuthProvider получает JWT через `initData` → каталог отображается
  - Переход на профиль → данные пользователя из `useAuth()`, не из inline fetch
  - «Выход» в TG → toast «В Telegram Mini App выход не требуется»
  - Страницы `orders`, `my-esim` не redirect на `/login` в TG среде
- **PWA Browser flow:**
  - Открыть `/profile` без токена → redirect на `/login`
  - Login → профиль → данные из `useAuth()`
  - «Выход» → `logout()` + redirect на `/login`
  - `orders`, `my-esim`, `balance` без токена → redirect на `/login`
- **Grep-верификация:**
  - `grep -r "import.*@/lib/auth" client/app/` — только `login/page.tsx` и `product/[id]` (для `isTelegramWebApp` UI check)
  - `grep -r "api.get.*auth/me" client/app/` — 0 совпадений
  - `grep -r "api.get.*auth/me" client/components/` — только `AuthProvider.tsx`
- **Telegram WebApp.showAlert:** Нативный TG alert в `product/[id]` при ошибке оплаты — работает (не заменён на Toast).
