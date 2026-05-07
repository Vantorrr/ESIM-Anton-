# Phase 6: Admin Orders, Analytics & Reporting

> [Корневой документ wiki](../README.md)

## Цель

Привести admin orders и analytics к бизнес-ожиданиям клиента: видеть оплаченные суммы, промокоды, сортировать и выгружать данные.

## Результат

- в admin orders видны promo code, discount и final paid amount;
- sorting/filtering работает по ключевым колонкам;
- export формирует согласованный отчёт;
- analytics считает revenue по фактически оплаченным заказам;
- delete/cancel policy для строк заказов явно зафиксирована.

## Оценка

Средний-высокий приоритет: влияет на операционную работу и финансовую отчётность.

## Зависит от

- [phase-3-admin-auth-and-api-security.md](./phase-3-admin-auth-and-api-security.md)
- [phase-2-runtime-verification.md](./phase-2-runtime-verification.md)
- [../info/bug-resolution.md](../info/bug-resolution.md)

## Пререквизиты

- admin write/read endpoints защищены backend auth;
- есть seeded или тестовые orders/payments/promocodes;
- согласовано, что считается paid revenue.

## Архитектурные решения

- Analytics не должен считать unpaid, failed, cancelled или тестовые orders как revenue.
- Удаление заказов опасно для audit trail; предпочтительный flow должен быть cancel/archive, если бизнес не требует hard delete.
- Export должен использовать backend-confirmed данные, а не только текущую страницу UI.

## Шаги (журналы)

- [Шаг 1. Сверить order/payment data model](./phase-6/step-1-order-payment-data-model.md)
- [Шаг 2. Доработать admin orders table](./phase-6/step-2-admin-orders-table.md)
- [Шаг 3. Реализовать export](./phase-6/step-3-export.md)
- [Шаг 4. Зафиксировать delete/cancel policy](./phase-6/step-4-delete-cancel-policy.md)
- [Шаг 5. Исправить analytics revenue](./phase-6/step-5-analytics-revenue.md)

## Верификация

- Заказ с промокодом отображает promo code, discount и final paid amount в admin table.
- Export содержит те же финансовые поля и открывается без сломанной кодировки.
- Analytics revenue совпадает с суммой paid orders на тестовом dataset.
- Dangerous delete недоступен без admin auth и явно выбранной policy.


## Журнал

- 


## Ссылки на ранее созданные фазы и шаги, которые нужно учитывать при разработке этой фазы и ссылка назад на главный файл фазы из каждого шага.

- [Корневой документ wiki](../README.md)
