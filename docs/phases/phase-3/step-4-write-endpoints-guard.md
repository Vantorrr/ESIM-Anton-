# Шаг 4. Закрыть write endpoints guard'ами

> [⬅️ Назад к фазе](../phase-3-admin-auth-and-api-security.md)

## Цель

Перенести фактическую защиту на backend.

## Что нужно сделать

- добавить `@UseGuards(JwtAdminGuard)` на write/admin routes;
- не закрывать публичные user-facing read endpoints;
- проверить Swagger decorators на соответствие фактической защите.

## Результат шага

Backend отклоняет прямые неавторизованные write-запросы.

## Статус

Не начато (Требует реализации)

## Журнал изменений

- Проведен первичный аудит (2026-05-07). Исключение составляет лишь метод `dedupe` в `products.controller.ts`. Остальные эндпоинты (например, в `promo-codes`, `system-settings` и `users`) имеют только декоратор swagger `@ApiBearerAuth()` без фактической защиты `@UseGuards(JwtAdminGuard)`. 
Внедрять гард до выполнения шагов 2 и 3 нельзя, иначе сломается работа админской панели.

## Файлы

- `backend/src/modules/**/*.controller.ts`

## Тестирование / Верификация

- Не проводилось (функционал отсутствует).
