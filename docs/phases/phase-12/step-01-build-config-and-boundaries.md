# Step 01 — Build config и error boundaries

> [⬅️ Назад к Phase 12](../phase-12-client-refactoring.md)

## Цель

Убрать костыли из build-конфигурации и добавить safety net для runtime-ошибок.

## Что нужно сделать

### 1.1 Убрать `ignoreBuildErrors` и `ignoreDuringBuilds`

- В `next.config.js` удалить блоки:
  ```js
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  ```
- Проверить: `next build` должен по-прежнему проходить с exit code 0.

### 1.2 Добавить root `error.tsx`

- Создать `app/error.tsx` — `'use client'` компонент.
- Показывает user-friendly сообщение об ошибке + кнопку «Попробовать снова» (`reset()`).
- Дизайн: использовать `globals.css` токены, соответствовать Liquid Glass UI.
- Не должен ломать Telegram Mini App контекст.

### 1.3 Добавить root `loading.tsx`

- Создать `app/loading.tsx`.
- Показывает спиннер/skeleton при route transitions.
- Минимальный компонент, не требует `'use client'`.

### 1.4 Убрать `export const dynamic = 'force-dynamic'` из profile

- В `app/profile/page.tsx:3` — удалить `export const dynamic = 'force-dynamic'`.
- При полностью client-side rendering эта директива не имеет эффекта.

## Результат шага

- `next.config.js` не содержит `ignoreBuildErrors` и `ignoreDuringBuilds`.
- `app/error.tsx` существует и ловит render-time ошибки.
- `app/loading.tsx` существует и показывает спиннер при навигации.
- `profile/page.tsx` не содержит `force-dynamic`.
- `next build` проходит чисто.

## Зависимости

Нет. Первый шаг фазы.

## Статус

`planned`

## Файлы

- `client/next.config.js` — удалить 2 блока
- `client/app/error.tsx` — [NEW]
- `client/app/loading.tsx` — [NEW]
- `client/app/profile/page.tsx` — удалить строку 3

## Тестирование / Верификация

- `tsc --noEmit` — 0 ошибок.
- `next build` — exit code 0, ✓ Compiled successfully.
- `next.config.js` grep `ignoreBuildErrors` — 0 совпадений.
- `next.config.js` grep `ignoreDuringBuilds` — 0 совпадений.
- `app/profile/page.tsx` grep `force-dynamic` — 0 совпадений.
- `app/error.tsx` существует.
- `app/loading.tsx` существует.
