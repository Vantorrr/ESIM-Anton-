# Шаг 1. Зафиксировать текущую auth-карту

> [⬅️ Назад к фазе](../phase-3-admin-auth-and-api-security.md)

## Цель

Понять, какие endpoints уже защищены, а какие только декларируют `@ApiBearerAuth()`.

## Что нужно сделать

- проверить backend controllers для products, settings, loyalty, promo codes, orders, payments, users;
- составить список read/write routes и текущих guards;
- сверить admin UI API calls с backend routes.

## Результат шага

Документирован список endpoints, которые нельзя закрывать без одновременной правки admin UI.

## Статус

Выполнено (Аудит проведен)

## Журнал изменений

- Проведен аудит. Все админские write endpoints (например в `products`, `promo-codes`, `system-settings`, `users`) используют только декоратор `@ApiBearerAuth()` без реального `@UseGuards(JwtAdminGuard)`. Исключение: `products/dedupe`.
- Admin UI (папка `admin/app/page.tsx`) использует frontend-only PIN-код, сохраняемый в localStorage (`ADMIN_PIN_STORAGE_KEY`), и не взаимодействует с backend JWT flow.

## Файлы

- `backend/src/modules/**/*.controller.ts`
- `admin/app/page.tsx`

## Тестирование / Верификация

- Аудит завершен. Выводы зафиксированы.
