# Step 03 — Декомпозиция god-pages

> [⬅️ Назад к Phase 12](../phase-12-client-refactoring.md)

## Цель

Разбить монолитные страницы (>15 KB) на фокусированные leaf-компоненты. Каждая страница — оркестратор, логика и UI в отдельных файлах.

## Что нужно сделать

### 3.1 `app/product/[id]/page.tsx` (32.7 KB → ~8 KB page + components)

Вычленить:
- `app/product/[id]/components/ProductDetails.tsx` — информация о продукте (название, цена, coverage, описание)
- `app/product/[id]/components/PurchaseFlow.tsx` — кнопки покупки (balance, card), promo code input, логика создания заказа
- `app/product/[id]/components/PaymentModal.tsx` — CloudPayments widget integration, 3DS handling

`page.tsx` остаётся оркестратором: загрузка продукта, state management, монтирование child-компонентов.

### 3.2 `app/profile/page.tsx` (25.9 KB → ~6 KB page + components)

Вычленить:
- `app/profile/components/ThemeModal.tsx` — выбор темы (light/dark/system)
- `app/profile/components/LanguageModal.tsx` — выбор языка (если есть)
- `app/profile/components/NotificationsModal.tsx` — настройки уведомлений
- `app/profile/components/ProfileStats.tsx` — блок со статистикой, баланс, уровень лояльности, реферальный блок

### 3.3 `app/page.tsx` (21.9 KB → ~6 KB page + components)

Вычленить:
- `app/components/SplashScreen.tsx` — splash video + animation (уже inline)
- `app/components/ProductList.tsx` — список продуктов с табами (popular/regions)
- `app/components/CountryGrid.tsx` — сетка стран с флагами
- `app/components/SearchBar.tsx` — поиск по каталогу

`page.tsx` — оркестратор: кэш из `sessionStorage`, загрузка данных, splash → каталог transition.

### 3.4 `app/my-esim/page.tsx` (22.6 KB → ~6 KB page + components)

Вычленить:
- `app/my-esim/components/EsimCard.tsx` — карточка отдельной eSIM
- `app/my-esim/components/UsageBar.tsx` — прогресс-бар использования трафика
- `ActivationBlock` — уже частично выделен inline, вынести в отдельный файл

### 3.5 `app/login/page.tsx` (17.9 KB → ~6 KB page + components)

Вычленить:
- `app/login/components/TelegramLogin.tsx` — Telegram WebApp auth flow
- `app/login/components/OAuthButtons.tsx` — кнопки Google/Yandex/VK
- `app/login/components/EmailLogin.tsx` — email form + OTP

### 3.6 `app/balance/page.tsx` (14.5 KB → ~5 KB page + components)

Вычленить:
- `app/balance/components/TopUpForm.tsx` — форма пополнения
- `app/balance/components/TransactionHistory.tsx` — история транзакций

### Правила декомпозиции

- Компоненты создаются в `app/<route>/components/` рядом с `page.tsx`.
- `page.tsx` остаётся `'use client'` и оркестрирует child-компоненты.
- Props передаются явно, без prop drilling глубже 2 уровней.
- Каждый компонент — self-contained: свои типы inline или в `types.ts` рядом.
- Не вычленять компоненты размером <50 строк — это микрооптимизация.

## Результат шага

- Все god-pages уменьшены до <10 KB (page.tsx).
- Логика покупки, оплаты, модалок, форм — в отдельных файлах.
- Нет потери функциональности.
- Каждый компонент можно прочитать и понять отдельно.

> ⚠️ **Важно для Step 04:** После декомпозиции inline auth fallback (`import('@/lib/auth')` + `api.get('/auth/me')`) окажется в child-компонентах (например `PurchaseFlow.tsx`, `TopUpForm.tsx`), а не в `page.tsx`. Step 04 должен искать auth-код в декомпозированных файлах.

## Зависимости

- Step 01 — build gate.
- Step 02 — `window.location` уже заменён, не путаемся при декомпозиции.

## Статус

`planned`

## Файлы

- `client/app/product/[id]/page.tsx` — декомпозиция
- `client/app/product/[id]/components/` — [NEW] 3 компонента
- `client/app/profile/page.tsx` — декомпозиция
- `client/app/profile/components/` — [NEW] 4 компонента
- `client/app/page.tsx` — декомпозиция
- `client/app/components/` — [NEW] 4 компонента
- `client/app/my-esim/page.tsx` — декомпозиция
- `client/app/my-esim/components/` — [NEW] 3 компонента
- `client/app/login/page.tsx` — декомпозиция
- `client/app/login/components/` — [NEW] 3 компонента
- `client/app/balance/page.tsx` — декомпозиция
- `client/app/balance/components/` — [NEW] 2 компонента

## Тестирование / Верификация

- `tsc --noEmit` — 0 ошибок после каждой декомпозиции.
- `next build` — exit code 0.
- Все god-pages `page.tsx` < 10 KB.
- Manual: каталог → продукт → покупка → мои eSIM — полный flow работает.
- Manual: профиль → настройки → модалки → выход — flow работает.
- Manual: баланс → пополнение → история — flow работает.
- Manual: login → Telegram / OAuth / email — все 3 метода работают.
