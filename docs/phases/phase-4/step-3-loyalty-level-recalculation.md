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

Не начато

## Журнал изменений

- 

## Файлы

- 

## Тестирование / Верификация

- 
