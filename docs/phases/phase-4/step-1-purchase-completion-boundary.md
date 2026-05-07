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

Не начато

## Журнал изменений

- 

## Файлы

- 

## Тестирование / Верификация

- 
