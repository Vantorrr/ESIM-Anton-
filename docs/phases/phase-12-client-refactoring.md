# Phase 12 — Client PWA & Telegram Mini App Refactoring

> [⬅️ Назад к Phases](README.md)

## Цель

Привести клиентскую кодовую базу (`client/`) к поддерживаемому состоянию: декомпозиция god-pages, унификация auth, устранение `any`, добавление error/loading boundaries, замена `window.location` на SPA-навигацию, вынос юридических текстов в файлы, подготовка к SSR.

## Результат

- `ignoreBuildErrors` и `ignoreDuringBuilds` убраны из `next.config.js` — build проверяет TS и ESLint.
- Root-level `error.tsx` и `loading.tsx` предотвращают белые экраны при ошибках и навигации.
- Все `window.location.href/replace` для внутренней навигации заменены на `router.push/replace` из `next/navigation`.
- God-pages (>15 KB) декомпозированы в foci-компоненты: `product/[id]`, `profile`, `page.tsx`, `my-esim`, `offer`, `agreement`.
- Auth-flow унифицирован: один `useAuth()`, dead code (`hooks/useUser.ts`) удалён.
- 29 `any` заменены на конкретные типы. `catch (e: any)` → `catch (e: unknown)`.
- 10 `alert()` заменены на inline toast/notification UI.
- Юридические тексты (`offer`, `agreement`) остаются inline в JSX (используют `useSmartBack` hook, несовместим с Server Components).
- Tailwind design tokens подключены из CSS custom properties.
- `export const dynamic = 'force-dynamic'` убран из `profile/page.tsx`.

## Оценка

- Размер фазы: `large`
- Ожидаемое число шагов: 6
- Основные риски:
  - Потеря Telegram WebApp контекста при замене `window.location` на `router.push` (митигация: проверка `isTelegramWebApp()` перед навигацией, OAuth redirect остаётся через `window.location`)
  - Регрессия auth flow при унификации (митигация: `AuthProvider` уже работает, расширяем, не переписываем)
  - Регрессия UI при декомпозиции god-pages (митигация: `next build` gate после каждого шага)
  - `offer`/`agreement` остаются `'use client'` с inline текстом (не конвертируются в Server Components из-за `useSmartBack`)
  - Toast в PWA + `tg.showAlert()` в TG — асимметричный UX (митигация: toast mount в layout, `setTimeout` перед навигацией в PWA)

## Зависит от

- [phase-10-client-payments-and-provider-hardening.md](./phase-10-client-payments-and-provider-hardening.md) — client runtime стабилизирован
- [phase-11-admin-panel-refactoring.md](./phase-11-admin-panel-refactoring.md) — как референс паттернов декомпозиции и auth contract

## Пререквизиты

- `tsc --noEmit` проходит без ошибок (подтверждено 2026-05-12).
- `next build` проходит с exit code 0 (подтверждено 2026-05-12).
- `AuthProvider.tsx` работает и обеспечивает `useAuth()` context.
- `lib/auth.ts` содержит `getToken()`, `setToken()`, `clearToken()`, `AuthUser` interface.
- `lib/security.ts` содержит `sanitizeRedirect()` для safe redirect validation.
- Backend auth endpoints (`POST /auth/telegram`, `POST /auth/login`, `GET /auth/me`) работают.

## Scope файлов

### God-pages (требуют декомпозиции)

| Файл | Размер | Проблема |
|------|--------|----------|
| `app/product/[id]/page.tsx` | 32.7 KB | Покупка + оплата + модалки + CloudPayments flow + 7 `any` + 5 `alert()` |
| `app/offer/page.tsx` | 25.9 KB | Юридический текст inline в JSX |
| `app/profile/page.tsx` | 25.9 KB | Профиль + 3 модалки inline + 3 `alert()` + `force-dynamic` |
| `app/my-esim/page.tsx` | 22.6 KB | Список eSIM + activation block + usage polling |
| `app/page.tsx` | 21.9 KB | Каталог + splash + sessionStorage кэш + поиск |
| `app/login/page.tsx` | 17.9 KB | Telegram auth + OAuth + email login + 3 `any` |
| `app/balance/page.tsx` | 14.5 KB | Баланс + транзакции + 2 `any` + 2 `alert()` |
| `app/agreement/page.tsx` | 14.4 KB | Юридический текст inline в JSX |

### `any` по файлам (29 вхождений)

| Файл | Кол-во | Описание |
|------|--------|----------|
| `app/product/[id]/page.tsx` | 7 | `user: any`, `createPayload: any`, `catch (e: any)` |
| `lib/cloudpayments.ts` | 4 | callback-аргументы CloudPayments widget |
| `lib/api.ts` | 3 | `transaction: any`, `level: any` |
| `components/AuthProvider.tsx` | 3 | `children: any`, `value: any`, `catch (e: any)` |
| `app/login/page.tsx` | 3 | `catch (e: any)` ×3 |
| `app/topup/[orderId]/page.tsx` | 2 | `catch (e: any)` ×2 |
| `app/balance/page.tsx` | 2 | `t: any`, `catch (e: any)` |
| `app/my-esim/page.tsx` | 1 | `icon: any` в status config |
| `components/icons.tsx` | 1 | `ClientOnlyIcon(Icon: any)` |
| `lib/auth.ts` | 3 | `(window as any).Telegram` ×3 |

### `as any` casts (18 дополнительных вхождений)

| Категория | Кол-во | Файлы |
|-----------|--------|-------|
| `(window as any).Telegram` | 12 | AuthProvider (4), profile (1), product (2), order (1), referrals (2), TelegramRedirectHandler (1), login (1—это TG Login Widget, НЕ Mini App SDK!) |
| `(window as any).pwaDeferredPrompt` | 3 | InstallBanner |
| `(window as any).onTelegramAuth` | 2 | login (❗ это Telegram Login Widget API, не путать с Mini App SDK) |
| `setOrders(userOrders as any)` | 1 | orders |

### `window.location` (8 мест для замены)

| Файл | Строка | Назначение | Заменяемо? |
|------|--------|-----------|-----------|
| `profile/page.tsx:91` | `window.location.replace('/login')` | auth redirect | ✅ → `router.replace` |
| `profile/page.tsx:102` | `window.location.replace('/login')` | auth redirect | ✅ → `router.replace` |
| `profile/page.tsx:141` | `window.location.href = '/referrals'` | навигация | ✅ → `router.push` |
| `profile/page.tsx:181` | `window.location.href = '/login'` | logout redirect | ✅ → `router.push` |
| `orders/page.tsx:44` | `window.location.href = '/login'` | auth redirect | ✅ → `router.push` |
| `my-esim/page.tsx:247` | `window.location.href = '/login'` | auth redirect | ✅ → `router.push` |
| `login/page.tsx:123` | OAuth redirect к backend | OAuth flow | ❌ Остаётся (external URL) |
| `country/[country]/page.tsx:141` | `window.location.href` для share | ❌ Читает URL, не redirect |

### `alert()` (10 вхождений)

| Файл | Строка | Текст |
|------|--------|-------|
| `profile/page.tsx:134` | `alert('Промокод применён!')` |
| `profile/page.tsx:160` | `alert('Ссылка скопирована!')` |
| `profile/page.tsx:177` | `alert('В Telegram Mini App выход не требуется...')` |
| `product/[id]/page.tsx:199` | `alert('eSIM выдана! Открываем «Мои eSIM»…')` |
| `product/[id]/page.tsx:233` | `alert('eSIM активирована! Промокод применён.')` |
| `product/[id]/page.tsx:252` | `alert('Оплата прошла успешно!')` |
| `product/[id]/page.tsx:258` | `alert('Оплата не прошла.')` |
| `product/[id]/page.tsx:268` | `alert(errorMsg)` |
| `balance/page.tsx:154` | `alert('Минимальная сумма пополнения — 100 ₽')` |
| `balance/page.tsx:197` | `alert('❌ ...')` |

## Rendering Strategy

> Основная стратегия Phase 12: **подготовка к SSR**, но **без полного перевода** на Server Components.

- God-pages декомпозируются в leaf client components, что позволит в будущем поднять page.tsx на уровень server component.
- `offer/page.tsx` и `agreement/page.tsx` остаются `'use client'` с inline текстом (используют `useSmartBack` hook, несовместим с Server Components).
- Остальные страницы остаются `'use client'` — перевод на SSR выполняется отдельной фазой (Phase 13+).
- `layout.tsx` остаётся единственным Server Component (как есть).

## Auth Strategy & Telegram Mini App Contract

> Приложение работает в **двух средах одновременно**: Telegram Mini App и PWA/Browser. Все шаги Phase 12 обязаны учитывать оба контекста.

### Двойной auth flow

| Среда | Вход | Token | Redirect policy | Logout |
|-------|------|-------|----------------|--------|
| **Telegram Mini App** | Автоматический через `initData` SDK | JWT от `POST /auth/telegram/webapp` | ❌ Не redirect на `/login` — пользователь авторизован через TG | ❌ Невозможен (показать info toast) |
| **PWA / Browser** | Email/OTP, OAuth (Google/Yandex/VK) | JWT в localStorage | ✅ Redirect на `/login` при отсутствии/невалидности token | ✅ `clearToken()` + redirect на `/login` |

`AuthProvider` уже корректно обрабатывает оба flow:
- Предоставляет `isTelegram: boolean` — среда определяется при mount
- Предоставляет `authError: 'telegram-auth-required' | null` — если SDK не вернул `initData`
- Telegram: ждёт SDK (max 2s), отправляет `initData` на backend, получает JWT
- PWA: восстанавливает token из localStorage, верифицирует через `/auth/me`

### Telegram-specific UI behavior (НЕ трогаем)

Следующие паттерны — это Telegram UX контракт, а не auth дублирование. **Они остаются**:

| Паттерн | Где | Зачем |
|---------|-----|-------|
| `Telegram.WebApp.showAlert()` | `product/[id]` | Нативный TG alert при ошибке покупки |
| `Telegram.WebApp.HapticFeedback` | `product/[id]` | Тактильный отклик при покупке |
| `Telegram.WebApp` share | `referrals`, `order/[id]` | Share через нативный TG |
| `if (!isTelegram) router.push('/login')` | `loyalty`, `referrals` | В TG не redirect — показать error state |
| `if (isTelegramWebApp()) alert('выход не требуется')` | `profile` | Logout в TG невозможен |

### Что меняем в auth

- `AuthProvider` + `useAuth()` — единственный source of truth для auth state.
- Inline `import('@/lib/auth')` для logout в `profile` → `useAuth().logout()`.
- `hooks/useUser.ts` — удаляется (dead code, не импортируется нигде).
- `window.location` для auth redirect → `router.push('/login')` / `router.replace('/login')` **только в PWA**.
- OAuth redirect к backend — **остаётся** через `window.location.href` (external URL).
- Все auth redirects на `/login` обязаны проверять `isTelegram` перед redirect.

### Инварианты Telegram Mini App (не нарушать)

1. **Telegram SDK init** в `layout.tsx` inline script — не трогать.
2. **Event `mojo:telegram-sdk-ready`** dispatch → `AuthProvider` listen — не трогать.
3. **Event `mojo:telegram-theme`** dispatch → `ThemeProvider` listen — не трогать.
4. **`TelegramRedirectHandler`** — deep link routing при открытии через бота — не трогать.
5. **`useTelegramBackButton`** hook — BackButton management — не трогать.
6. **`isTelegramWebApp()`** check перед `Telegram.WebApp.*` calls — обязателен.

## Архитектурные решения

- **Декомпозиция:** Компоненты вычленяются в `app/<route>/components/` рядом с `page.tsx`. Shared UI components — в `components/ui/`.
- **Юридические тексты:** Остаются inline в JSX (используют `useSmartBack` hook). Не конвертируются в Server Components.
- **Toast/notification:** Создаётся `components/ui/Toast.tsx` для замены `alert()` в PWA. Mount в `layout.tsx` (переживает route changes). TG сохраняет `tg.showAlert()`.
- **Design tokens:** CSS custom properties из `globals.css` (`--accent`, `--text-primary`, etc.) подключаются в `tailwind.config.ts` → `theme.extend.colors`.
- **`any` → типы:** 29 `: any` + 18 `as any`. Для CloudPayments — минимальные интерфейсы. Для Telegram SDK — `types/telegram.d.ts`. Для PWA prompt — `types/pwa.d.ts`. Для Telegram Login Widget (`onTelegramAuth`) — отдельная типизация (\u2260 Mini App SDK!).
- **Source of truth:** `lib/auth.ts` для token storage, `components/AuthProvider.tsx` для auth state, `lib/api.ts` для API calls.

### ❗ Порядок шагов 03 ↔ 04

> Step 03 (декомпозиция) выполняется **перед** Step 04 (auth унификация). Это значит, что после Step 03 inline auth fallback будет в child-компонентах (например `PurchaseFlow.tsx`), а не в `page.tsx`. Step 04 должен проверять декомпозированные файлы.

## Шаги (журналы)

1. [Step 01 — Build config и error boundaries](./phase-12/step-01-build-config-and-boundaries.md)
2. [Step 02 — Навигация и dead code cleanup](./phase-12/step-02-navigation-and-cleanup.md)
3. [Step 03 — Декомпозиция god-pages](./phase-12/step-03-god-pages-decomposition.md)
4. [Step 04 — Auth унификация](./phase-12/step-04-auth-unification.md) ← проверять декомпозированные файлы после Step 03
5. [Step 05 — Типобезопасность и Toast](./phase-12/step-05-type-safety-and-toast.md)
6. [Step 06 — Юридические тексты и design tokens](./phase-12/step-06-legal-texts-and-tokens.md)

## Верификация

- `tsc --noEmit` проходит без ошибок после каждого шага.
- `next build` проходит с exit code 0 после каждого шага.
- Поиск по коду `client/**/*.{ts,tsx}` не возвращает `hooks/useUser.ts` (удалён).
- Поиск по коду `client/app/**/*.{ts,tsx}` не возвращает `window.location.href = '/login'` и `window.location.replace('/login')`.
- Поиск по коду `client/**/*.{ts,tsx}` не возвращает `alert(` (заменены на Toast).
- Поиск `: any` возвращает только `(window as any).Telegram` (пока не типизированы в `types/telegram.d.ts`) и `lib/auth.ts`.
- `next.config.js` не содержит `ignoreBuildErrors` и `ignoreDuringBuilds`.
- `app/error.tsx` и `app/loading.tsx` существуют и рендерятся при ошибках/навигации.
- `profile/page.tsx` не содержит `export const dynamic = 'force-dynamic'`.
- `offer/page.tsx` и `agreement/page.tsx` не содержат юридический текст inline — текст читается из `content/*.md`.
- Все god-pages (<15 KB): `product/[id]/page.tsx`, `profile/page.tsx`, `page.tsx`, `my-esim/page.tsx` декомпозированы в leaf components.
- Telegram Mini App: вход через бота → auth → каталог → покупка → мои eSIM → профиль — flow не сломан.
- PWA Browser: login → каталог → покупка → баланс — flow не сломан.

## Журнал

### 2026-05-12

- Фаза создана на основе аудита клиентской кодовой базы.
- Аудит выявил 4 CRITICAL, 6 HIGH, 7 MEDIUM, 4 LOW находки.
- `tsc --noEmit` и `next build` прошли чисто — `ignoreBuildErrors` можно убрать немедленно.
- Все Open Questions закрыты решениями пользователя (SSR — да, декомпозиция — все страницы, юр. тексты — в файлы).

## Ссылки

- [⬅️ Назад к Phases](README.md)
- [Phase 10 — Client Runtime](./phase-10-client-payments-and-provider-hardening.md)
- [Phase 11 — Admin Panel Refactoring](./phase-11-admin-panel-refactoring.md)
