# Шаг 3. Подключить loyalty level recalculation

> [⬅️ Назад к фазе](../phase-4-loyalty-and-referral-wiring.md)

## Цель

Обновлять уровень пользователя после роста `totalSpent`.

## Что нужно сделать

- вызвать `LoyaltyService.updateUserLevel()` после successful purchase;
- проверить discount/cashback semantics;
- сохранить audit trail, если текущая модель это поддерживает.

## Результат шага

Пользователь переходит между loyalty levels после достижения порогов.

## Статус

Завершено
- После increment `User.totalSpent` purchase flow вызывает `LoyaltyService.updateUserLevel(order.userId)`.
- Порядок side effects зафиксирован так: сначала cashback по текущему уровню, затем рост `totalSpent`, затем referral bonus, затем пересчёт loyalty level на будущие покупки.
- Top-up flow не участвует в этом пересчёте, потому что он проходит через `fulfillTopupOrder()`, а не через purchase-ветку `fulfillOrder()`.
## Журнал изменений
- [backend/src/modules/orders/orders.service.ts](../../../backend/src/modules/orders/orders.service.ts)
- [backend/src/modules/loyalty/loyalty.service.ts](../../../backend/src/modules/loyalty/loyalty.service.ts)
- [backend/src/modules/orders/orders.module.ts](../../../backend/src/modules/orders/orders.module.ts)
- 
- `npx jest orders.service.spec.ts --runInBand`
- `npx tsc --noEmit -p tsconfig.json`
## Файлы

- 

## Тестирование / Верификация

- 
