# Шаг 1. Зафиксировать purchase completion boundary

> [⬅️ Назад к фазе](../phase-4-loyalty-and-referral-wiring.md)

## Цель

Определить единственную точку, где заказ считается успешно оплаченным и выполненным.

## Что нужно сделать

- изучить `OrdersService.fulfillOrder()`, payment callbacks и status transitions;
- определить, где изменяются `Order.status`, `Payment.status`, `User.totalSpent`;
- зафиксировать идемпотентный ключ для referral/loyalty side effects.

## Результат шага

Есть выбранная точка интеграции без дублирующих начислений.

## Статус

Завершено
- `OrdersService.fulfillOrder()` подтверждён как единая точка completion-side effects для трёх входов: Robokassa/CloudPayments callbacks, purchase from balance и `POST /orders/:id/fulfill-free`.
- Top-up намеренно исключён из этой ветки: при `parentOrderId + topupPackageCode` управление уходит в `fulfillTopupOrder()`, где не начисляются referral/loyalty side effects.
- После реализации фазы денежные purchase side effects больше не могут перевести уже выданную eSIM в локальный `FAILED`: completion boundary разделена от provider-failure path.
## Журнал изменений
- [backend/src/modules/orders/orders.service.ts](../../../backend/src/modules/orders/orders.service.ts)
- [backend/src/modules/orders/orders.controller.ts](../../../backend/src/modules/orders/orders.controller.ts)
- [backend/src/modules/payments/payments.service.ts](../../../backend/src/modules/payments/payments.service.ts)
- [backend/src/modules/payments/cloudpayments.service.ts](../../../backend/src/modules/payments/cloudpayments.service.ts)
- 
- `npx jest orders.service.spec.ts --runInBand`
- `npx tsc --noEmit -p tsconfig.json`
## Файлы

- 

## Тестирование / Верификация

- 
