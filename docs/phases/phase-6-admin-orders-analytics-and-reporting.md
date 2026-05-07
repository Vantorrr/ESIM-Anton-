# Phase 6: Admin Orders, Analytics & Reporting

> [Корневой документ wiki](../README.md)

## Цель

Привести admin orders и analytics к бизнес-ожиданиям клиента: видеть оплаченные суммы, промокоды, сортировать и выгружать данные.

## Результат

- в admin orders видны promo code, discount и final paid amount;
- sorting/filtering работает по ключевым колонкам;
- export формирует согласованный отчёт;
- analytics считает revenue по фактически оплаченным заказам;
- вкладка `analytics` в admin перестаёт быть заглушкой и использует существующие backend endpoints осознанно;
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
- согласовано, что считается paid revenue;
- зафиксировано, какие сущности участвуют в отчётности: `Order`, `Transaction`, `PromoCode`, а не несуществующая отдельная таблица `Payment`.

## Архитектурные решения

- Analytics не должен считать unpaid, failed, cancelled или тестовые orders как revenue.
- Удаление заказов опасно для audit trail; предпочтительный flow должен быть cancel/archive, если бизнес не требует hard delete.
- Export должен использовать backend-confirmed данные, а не только текущую страницу UI.
- Формула `final paid amount` должна быть явно зафиксирована: `Order.totalAmount` после promo/loyalty/bonus adjustments, а не `productPrice`.
- Если analytics остаётся на `Order.totalAmount`, нужно отдельно решить, включаются ли balance-paid и top-up orders в revenue одинаково с card-paid orders.

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

- **[2026-05-07] Аудит текущего состояния:**
  - Backend `Order` уже хранит `productPrice`, `discount`, `promoCode`, `promoDiscount`, `bonusUsed`, `totalAmount`, поэтому Phase 6 не требует schema expansion для базовых финансовых колонок.
  - Admin `Orders` component пока отображает только ID, пользователя, продукт, `totalAmount`, статус и дату без сортировки, фильтров и export.
  - Вкладка `analytics` в `admin/app/page.tsx` остаётся заглушкой, хотя backend `analytics` endpoints и dashboard widget уже существуют.
  - `AnalyticsService` сейчас считает revenue по `Order.totalAmount` для `COMPLETED` заказов. Перед реализацией нужно подтвердить, совпадает ли это с бизнес-определением и как трактовать top-up/balance flows.
  - Отдельного delete flow для заказов в текущем admin UI нет, поэтому сначала требуется policy/ADR, а уже потом контроллеры и кнопки.


## Ссылки на ранее созданные фазы и шаги, которые нужно учитывать при разработке этой фазы и ссылка назад на главный файл фазы из каждого шага.

- [Корневой документ wiki](../README.md)
