# Шаг 4. Добавить backend tests или сценарные smoke-checks

> [⬅️ Назад к фазе](../phase-4-loyalty-and-referral-wiring.md)

## Цель

Проверить денежные side effects воспроизводимо.

## Что нужно сделать

- подготовить тестового referrer и referred user;
- создать successful order;
- проверить bonus transaction/balance;
- создать покупку на сумму, достаточную для повышения loyalty level.

## Результат шага

Referral и loyalty работают на проверяемых сценариях.

## Статус

Завершено
- Добавлены unit-тесты на `ReferralsService.awardReferralBonus()` с проверкой чтения `SystemSettings`, отключения программы и защиты от повторного начисления.
- Добавлены unit-тесты на `OrdersService.fulfillOrder()` с проверкой cashback/referral/loyalty wiring и с отдельным сценарием, что падение referral awarding не откатывает уже completed order.
## Журнал изменений
- [backend/src/modules/referrals/referrals.service.spec.ts](../../../backend/src/modules/referrals/referrals.service.spec.ts)
- [backend/src/modules/orders/orders.service.spec.ts](../../../backend/src/modules/orders/orders.service.spec.ts)
- 
- `npx jest referrals.service.spec.ts --runInBand`
- `npx jest orders.service.spec.ts --runInBand`
- `npx tsc --noEmit -p tsconfig.json`
## Файлы

- 

## Тестирование / Верификация

- 
