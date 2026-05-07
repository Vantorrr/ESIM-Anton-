# Шаг 2. Подключить referral bonus awarding

> [⬅️ Назад к фазе](../phase-4-loyalty-and-referral-wiring.md)

## Цель

Сделать реферальный бонус реальным side effect successful order.

## Что нужно сделать

- подключить `ReferralsService.awardReferralBonus()` к выбранному flow;
- читать `REFERRAL_BONUS_PERCENT`, `REFERRAL_ENABLED`, `REFERRAL_MIN_PAYOUT` из `SystemSettings`;
- создать transaction/balance side effect для referrer;
- защититься от повторного начисления.

## Результат шага

После оплаченного заказа приглашённого пользователя referrer получает корректный бонус.

## Статус

Завершено
- `OrdersService.applyPurchaseCompletionEffects()` вызывает `ReferralsService.awardReferralBonus()` после роста `totalSpent`, если у покупателя заполнен `referredById`.
- `ReferralsService` больше не читает `REFERRAL_BONUS_PERCENT` из env; вместо этого используется `SystemSettingsService.getReferralSettings()`.
- Для идемпотентности добавлен guard: если уже существует `TransactionType.REFERRAL_BONUS` со статусом `SUCCEEDED` для того же `orderId`, повторное начисление не выполняется.
## Журнал изменений
- [backend/src/modules/orders/orders.service.ts](../../../backend/src/modules/orders/orders.service.ts)
- [backend/src/modules/referrals/referrals.service.ts](../../../backend/src/modules/referrals/referrals.service.ts)
- [backend/src/modules/referrals/referrals.module.ts](../../../backend/src/modules/referrals/referrals.module.ts)
- 
- `npx jest referrals.service.spec.ts --runInBand`
- `npx jest orders.service.spec.ts --runInBand`
## Файлы

- 

## Тестирование / Верификация

- 
