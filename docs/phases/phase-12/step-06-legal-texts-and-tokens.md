# Step 06 — Юридические тексты и design tokens

> [⬅️ Назад к Phase 12](../phase-12-client-refactoring.md)

## Цель

~~Вынести юридические тексты из JSX в `.md` файлы.~~ Подключить CSS custom properties в Tailwind config. Синхронизировать версию.

## Что нужно сделать

### 6.1 Юридические тексты — остаются inline

> ℹ️ Решение: `offer/page.tsx` и `agreement/page.tsx` **не конвертируются** в Server Components и не выносятся в `.md`. Причина: оба файла используют `useSmartBack()` hook, который требует `'use client'`.

Тексты остаются inline в JSX. Никаких изменений в этих файлах.

### 6.2 Подключить design tokens в Tailwind

Текущие CSS custom properties в `globals.css`:
```css
:root {
  --accent: #f77430;
  --text-primary: ...;
  --bg-primary: ...;
}
```

Подключить в `tailwind.config.ts`:
```ts
theme: {
  extend: {
    colors: {
      accent: 'var(--accent)',
      'text-primary': 'var(--text-primary)',
      'bg-primary': 'var(--bg-primary)',
    }
  }
}
```

После подключения — заменить hardcoded hex в `BottomNav.tsx` и других компонентах:
- `text-[#f77430]` → `text-accent`
- Аналогичные замены по найденным hardcoded цветам.

> Не требуется заменять ВСЕ inline цвета за раз — только наиболее частые (`#f77430`, `#f2622a`). Полная миграция — follow-up.

### 6.3 Версия из package.json

В `profile/page.tsx` заменить hardcoded `Версия 1.0.0` на чтение из `package.json`:
```ts
import packageJson from '@/package.json'
// ...
<p>Версия {packageJson.version}</p>
```

### 6.4 Заменить hardcoded `oferta.pdf` URL

В `product/[id]/page.tsx:676` (или декомпозированном компоненте после Step 03):
```html
<!-- БЫЛО -->
<a href="https://app.mojomobile.ru/oferta.pdf" target="_blank">условия оферты</a>

<!-- СТАЛО -->
<Link href="/offer">условия оферты</Link>
```

> ℹ️ Страница `/offer` уже существует и содержит полный текст оферты. Внешняя ссылка на `oferta.pdf` дублирует контент и не обновляется синхронно.

## Результат шага

- `offer/page.tsx` и `agreement/page.tsx` — остаются `'use client'` с inline текстами (без изменений).
- `tailwind.config.ts` содержит brand colors из CSS custom properties.
- `#f77430` заменён на `accent` в BottomNav и ключевых компонентах.
- Версия в профиле синхронизирована с `package.json`.
- `oferta.pdf` hardcoded URL заменён на `<Link href="/offer">`.

## Зависимости

- Step 01 — build config чист.
- Step 03 — god-pages декомпозированы (offer/agreement могли быть затронуты).

## Статус

`planned`

## Файлы

- `client/tailwind.config.ts` — добавить design tokens
- `client/components/BottomNav.tsx` — заменить hardcoded hex
- `client/app/profile/page.tsx` (или components) — версия из package.json
- `client/app/product/[id]/page.tsx` (или декомпозированный компонент) — замена `oferta.pdf` → `/offer`

> ℹ️ `offer/page.tsx` и `agreement/page.tsx` не трогаем.

## Тестирование / Верификация

- `grep "#f77430" client/components/BottomNav.tsx` — 0 совпадений.
- `tailwind.config.ts` содержит `accent` в `theme.extend.colors`.
- `tsc --noEmit` — 0 ошибок. `next build` — exit code 0.
- Manual: `/offer` — юридический текст рендерится корректно (без изменений).
- Manual: `/profile` — версия соответствует `package.json`.
