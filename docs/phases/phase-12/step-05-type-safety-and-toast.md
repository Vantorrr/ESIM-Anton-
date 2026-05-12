# Step 05 — Типобезопасность и Toast

> [⬅️ Назад к Phase 12](../phase-12-client-refactoring.md)

## Цель

Устранить `any` типы и заменить `alert()` на inline Toast-компонент.

## Что нужно сделать

### 5.1 Создать Toast-компонент

- `components/ui/Toast.tsx` — `'use client'`, variants: success/error/info, auto-dismiss 3-5s, `aria-live="polite"`, fixed bottom над BottomNav, Liquid Glass стиль.
- `components/ui/ToastProvider.tsx` — context для `useToast()`.
- Подключить в `app/layout.tsx` — **Toast mount на уровне layout, чтобы переживал route changes**.

> ⚠️ **Критически важно:** Toast должен быть в `layout.tsx` (не в page-компонентах), иначе при `router.push('/my-esim')` после покупки toast демонтируется вместе со страницей и пользователь не увидит сообщение.

### 5.2 Заменить 10 `alert()` на Toast (с TG-aware стратегией навигации)

**Проблема:** 5 из 10 `alert()` находятся в `else`-ветках конструкции:
```ts
if (tg) {
  tg.showAlert('Сообщение', () => router.push('/my-esim'))  // модальный, навигация в callback
} else {
  alert('Сообщение')       // ← заменяем на Toast
  router.push('/my-esim')  // навигация сразу после
}
```

`tg.showAlert()` — **модальный** (блокирует UI), навигация в callback.
`showToast()` — **не блокирует**, навигация мгновенная → пользователь не увидит toast.

**Стратегия замены:**
- В PWA/Browser: `showToast('Сообщение')` + `setTimeout(() => router.push('/my-esim'), 1500)` — дать прочитать.
- В TG: оставить `tg.showAlert()` с callback — нативный UX, не трогать.

| Файл | Текст | Variant | Навигация после |
|------|-------|---------|-----------------|
| `profile:134` | Промокод применён! | success | Нет |
| `profile:160` | Ссылка скопирована! | success | Нет |
| `profile:177` | В TG выход не требуется | info | Нет |
| `product:199` | eSIM выдана! | success | `/my-esim` через `setTimeout(1500)` |
| `product:233` | eSIM активирована! | success | `/my-esim` через `setTimeout(1500)` |
| `product:252` | Оплата прошла! | success | `/my-esim` через `setTimeout(1500)` |
| `product:258` | Оплата не прошла | error | Нет |
| `product:268` | errorMsg | error | Нет |
| `balance:154` | Мин. сумма 100₽ | error | Нет |
| `balance:197` | Error message | error | Нет |

> ℹ️ **Стратегия для Telegram:** Toast компонент **не используется** в TG Mini App. В TG среде все уведомления идут через `tg.showAlert()` (модальный). Не должно быть двух параллельных систем уведомлений. Правило: `if (isTelegram) tg.showAlert(msg) else showToast(msg)`.

### 5.3 `catch (e: any)` → `catch (e: unknown)` (10 мест)

Файлы: product/[id], topup/[orderId], profile, login (×3), balance, AuthProvider.

### 5.4 Бизнес-типы вместо `any`

- `product/[id]`: `user: any` → `AuthUser`, `createPayload: any` → typed, `(o: any)` → `Order`
- `api.ts`: `transaction: any` → `CloudPaymentTransaction`, `(level: any)` → typed
- `balance`: `(t: any)` → `Transaction`
- `my-esim`: `icon: any` → `React.ComponentType`
- `icons.tsx`: `Icon: any` → `React.ComponentType<SVGProps>`
- `cloudpayments.ts`: `options?: any` → typed interfaces

> ⚠️ `Window.cp` уже расширен в `cloudpayments.ts:12-16` (`declare global { interface Window { cp?: ... } }`). Типизацию `CloudPayments` class расширять **в том же файле**, не создавать отдельные `types/cloudpayments.d.ts`.

- `AuthProvider`: `children: any` → `ReactNode`, `value: any` → `AuthUser`, `Promise<any | null>` (L:76) → `Promise<TelegramWebApp | null>` (зависит от полноты `types/telegram.d.ts`)
- `auth.ts`: `(window as any).Telegram` → через `types/telegram.d.ts`

### 5.5 Типизация `as any` casts (18 мест)

Помимо `: any`, файлы содержат 18 `as any` casts:

| Категория | Файлы | Решение |
|-----------|-------|---------|
| `(window as any).Telegram` ×12 | AuthProvider, profile, product, order, referrals, TelegramRedirectHandler | Создать `types/telegram.d.ts` с `declare global { interface Window { Telegram?: { WebApp: TelegramWebApp } } }` |
| `(window as any).pwaDeferredPrompt` ×3 | InstallBanner | Добавить в `types/pwa.d.ts`: `interface Window { pwaDeferredPrompt?: BeforeInstallPromptEvent }` |
| `(window as any).onTelegramAuth` ×2 | login | Добавить `onTelegramAuth?` в Window (это Telegram Login Widget, НЕ Mini App SDK) |
| `setOrders(userOrders as any)` ×1 | orders | Типизировать ответ `ordersApi.getMy()` |

> ⚠️ **Telegram Login Widget ≠ Telegram Mini App SDK.**
> В `login/page.tsx` используются **две разных Telegram API**:
> - `window.Telegram.WebApp` — Mini App SDK (авторедирект при `isTelegramWebApp()`, L:34-37)
> - `window.onTelegramAuth` — Telegram Login Widget callback (`data-onauth="onTelegramAuth(user)"`, L:61-78)
>
> Это **разные продукты** с разными типами. `types/telegram.d.ts` покрывает Mini App SDK. Для Login Widget нужна отдельная типизация `window.onTelegramAuth: (userData: TelegramLoginUser) => void`.

## Результат шага

- 0 `alert(` в `client/app/`.
- 0 `: any` в `client/app/` и `client/lib/` (кроме `cloudpayments.ts` vendor typing).
- 0 `as any` кроме обоснованных исключений (если vendor API не имеет типов).
- Toast UI заменяет все browser alerts в PWA; Telegram сохраняет `tg.showAlert()`.
- Toast mount в `layout.tsx` — переживает route changes.

## Зависимости

- Step 03 — god-pages декомпозированы.

## Статус

`planned`

## Файлы

- `components/ui/Toast.tsx` — [NEW]
- `components/ui/ToastProvider.tsx` — [NEW]
- `app/layout.tsx`, `app/product/[id]/`, `app/profile/`, `app/balance/`, `app/topup/[orderId]/`, `app/login/`, `app/my-esim/`, `lib/cloudpayments.ts`, `lib/api.ts`, `components/AuthProvider.tsx`, `components/icons.tsx`, `lib/auth.ts`

## Тестирование / Верификация

- `grep "alert(" client/app/` — 0.
- `grep ": any" client/app/ client/lib/ client/components/` — 0 (кроме cloudpayments vendor).
- `grep "as any" client/` — только обоснованные исключения с комментарием.
- `tsc --noEmit` — 0 ошибок. `next build` — exit code 0.
- Manual PWA: покупка → toast видимый 1.5s → навигация → toast не пропадает.
- Manual TG: покупка → tg.showAlert модальный → callback навигация → работает.
