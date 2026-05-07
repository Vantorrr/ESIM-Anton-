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

Не начато

## Журнал изменений

- 

## Файлы

- 

## Тестирование / Верификация

- 
