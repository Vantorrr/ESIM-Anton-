# Шаг 1. Client startup orchestration и hydration boundaries

> [⬅️ Назад к фазе](../phase-10-client-payments-and-provider-hardening.md)

## Цель

Стабилизировать стартовый runtime клиента без массового архитектурного переворота: убрать blind coordination по таймерам между `TelegramSdkScript`, `AuthProvider` и `TelegramRedirectHandler`, а также зафиксировать единый pattern для hydration-sensitive routes.

## Что нужно сделать

### 1.1 Перепроверить startup sequence

- Зафиксировать фактический порядок инициализации:
  - `client/app/layout.tsx`;
  - `client/components/TelegramSdkScript.tsx`;
  - `client/components/AuthProvider.tsx`;
  - `client/components/TelegramRedirectHandler.tsx`.
- Отдельно описать, какие состояния считаются нормальными:
  - cached token/user restored instantly;
  - Telegram SDK ещё не готов;
  - auth still verifying;
  - redirect/new-order checks ещё не должны запускаться.

### 1.2 Убрать зависимость от fixed `setTimeout(1000)`

- Заменить blind fixed delay в `TelegramRedirectHandler` на coordination signal от auth/bootstrap состояния.
- Не ломать существующий сценарий, где Telegram SDK приходит чуть позже initial render.
- Не убирать fallback handling для случаев, когда Telegram окружения нет вообще.

### 1.3 Зафиксировать hydration-sensitive route patterns

- Выделить маршруты, где используется `useSearchParams()` или browser-only стартовое состояние:
  - `/balance`;
  - `/product/[id]`;
  - `/country/[country]`;
  - `/login`;
  - `/login/callback`.
- Привести их к согласованному pattern там, где нужен thin wrapper + `Suspense`.
- Не делать blanket-рефакторинг всех pages — только тех, где реально есть риск build/prerender regression.

### 1.4 Задокументировать границы `suppressHydrationWarning`

- Зафиксировать, какие mismatch-источники пока остаются intentional.
- Не удалять global suppression, но добавить wiki/phase notes, почему он ещё существует и что нужно сделать до его сужения.

## Результат шага

- Startup flow клиента меньше зависит от случайной скорости загрузки SDK и сети.
- Hydration-sensitive routes описаны и приведены к минимально безопасному pattern.
- Появляется явная карта того, что является intentional client-only behavior, а что является bug risk.

## Статус

Не начато

## Журнал изменений

- 

## Файлы

- `client/app/layout.tsx`
- `client/components/AuthProvider.tsx`
- `client/components/TelegramRedirectHandler.tsx`
- `client/components/TelegramSdkScript.tsx`
- `client/app/balance/page.tsx`
- `client/app/product/[id]/page.tsx`
- `client/app/country/[country]/page.tsx`
- `client/app/login/page.tsx`
- `client/app/login/callback/page.tsx`
- `docs/audits/audit.md`

## Тестирование / Верификация

- Cold open внутри Telegram Mini App не ломает redirect/new-order logic.
- Пользователь со stored token видит прежний fast-path restore.
- При медленной загрузке Telegram SDK приложение не уходит в permanent inconsistent state.
- `npm run build` для `client` проходит.
- Маршруты с `useSearchParams()` не провоцируют новый prerender failure.
