# Step 06 — ESLint и cleanup

> [⬅️ Phase 11](../phase-11-admin-panel-refactoring.md)

## Цель

Настроить ESLint CLI для текущего Next.js runtime, удалить re-export bridge и dead code, добиться чистого lint pass без warnings и errors.

## Что нужно сделать

1. Создать или обновить ESLint-конфиг для запуска через ESLint CLI:
    ```json
    {
      "extends": "next/core-web-vitals",
      "rules": {
        "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
        "no-console": ["error", { "allow": ["warn", "error"] }]
      }
    }
    ```
    > `eslint-config-next` уже в devDependencies. Цель шага — рабочий lint pipeline через ESLint CLI, а не через deprecated `next lint`.
2. Обновить `admin/package.json`:
   - `lint` script должен запускать ESLint CLI, а не `next lint`
   - пример направления: `eslint . --ext .js,.ts,.tsx`
3. Запустить lint и итеративно фиксить:
   - Unused imports
   - Unused variables
   - `console.log()` → убрать или заменить на `console.warn`/`error`
   - Проверить, что Next/App Router правила реально применяются к `app/`, `components/`, `lib/`
4. **Re-export exit:** удалить `Products.tsx` re-export bridge:
   - Проверить: поиск по коду `from.*Products` не возвращает импорты старого пути
   - Если все импорты уже идут через route pages → удалить `Products.tsx`
   - Если остались — обновить импорты и удалить
5. CSS cleanup в `globals.css`:
   - Убрать неиспользуемые CSS variables (shadcn-ui palette, если не задействованы)
   - Проверить orphan классы

## Результат шага

- `.eslintrc.json` создан.
- `admin/package.json` использует ESLint CLI вместо `next lint`.
- ESLint проходит без warnings и errors.
- `Products.tsx` re-export удалён — прямые импорты обновлены.
- Нет orphan CSS variables.

## Зависимости

- Step 05 (все routes и компоненты финализированы).

## Статус

`completed`

## Файлы

- `admin/.eslintrc.json` — [NEW]
- `admin/package.json` — обновлён `lint` script
- `admin/app/globals.css` — удаление dead CSS
- `admin/components/Products.tsx` — [DELETE] re-export bridge
- Все `admin/**/*.{ts,tsx}` — fix lint warnings

## Тестирование / Верификация

- `npm run lint` проходит через ESLint CLI без warnings и errors
- `npm run build` проходит
- `admin/package.json` использует `eslint . --ext .js,.ts,.tsx` вместо deprecated `next lint`
- `Products.tsx` bridge удалён; route page импортирует `@/components/products/ProductsPage` напрямую
- `globals.css` очищен от неиспользуемых shadcn-style CSS variables, оставлены только реально задействованные
