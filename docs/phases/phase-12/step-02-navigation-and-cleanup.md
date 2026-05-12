# Step 02 — Навигация и dead code cleanup

> [⬅️ Назад к Phase 12](../phase-12-client-refactoring.md)

## Цель

Заменить `window.location.href/replace` для внутренней навигации на SPA-навигацию через `next/navigation`, удалить dead code.

## Что нужно сделать

### 2.1 Заменить `window.location` на `router.push/replace`

Все замены — внутренняя навигация. OAuth redirect к backend (`login/page.tsx:123`) и чтение URL (`country/[country]/page.tsx:141`) **не трогаем**.

| Файл | Строка | Было | Стало |
|------|--------|------|-------|
| `profile/page.tsx:91` | `window.location.replace('/login')` | → `router.replace('/login')` |
| `profile/page.tsx:102` | `window.location.replace('/login')` | → `router.replace('/login')` |
| `profile/page.tsx:141` | `window.location.href = '/referrals'` | → `router.push('/referrals')` |
| `profile/page.tsx:181` | `window.location.href = '/login'` | → `router.push('/login')` |
| `orders/page.tsx:44` | `window.location.href = '/login'` | → `router.push('/login')` |
| `my-esim/page.tsx:247` | `window.location.href = '/login'` | → `router.push('/login')` |

- Убедиться, что `useRouter` из `next/navigation` уже импортирован в каждом из этих файлов, или добавить импорт.
- Для `profile/page.tsx` учесть, что redirect `/login` при 401 не должен конфликтовать с Telegram WebApp (при `isTelegramWebApp()` redirect может быть не нужен).

### 2.2 Удалить `hooks/useUser.ts`

- Файл не импортируется нигде в проекте (подтверждено grep).
- `AppUser` interface дублирует `AuthUser` из `lib/auth.ts`.
- Удалить файл целиком.

### 2.3 Удалить `hooks/` директорию, если пуста

- Проверить, остались ли файлы в `hooks/` после удаления `useUser.ts`.
- Если только `useTelegramBackButton.ts` — оставить.
- Если директория пуста — удалить.

## Результат шага

- Все внутренние `window.location.href/replace` заменены на `router.push/replace`.
- `hooks/useUser.ts` удалён.
- Навигация внутри приложения не вызывает full page reload.
- Telegram WebApp контекст сохраняется при навигации.

## Зависимости

- Step 01 — build config должен быть чист для верификации.

## Статус

`planned`

## Файлы

- `client/app/profile/page.tsx` — 4 замены `window.location`
- `client/app/orders/page.tsx` — 1 замена
- `client/app/my-esim/page.tsx` — 1 замена
- `client/hooks/useUser.ts` — [DELETE]

## Тестирование / Верификация

- `grep -r "window.location.href = '/login'" client/app/` — 0 совпадений.
- `grep -r "window.location.replace('/login')" client/app/` — 0 совпадений.
- `grep -r "useUser" client/` — 0 совпадений (кроме удалённого файла).
- `tsc --noEmit` — 0 ошибок.
- `next build` — exit code 0.
- Manual: перейти на `/profile` без токена → redirect на `/login` без перезагрузки страницы.
- Manual: нажать «Выход» → redirect на `/login` без перезагрузки.
- Manual: Telegram Mini App → навигация между страницами → контекст сохраняется.
