# Phase 4: Loyalty & Referral Wiring

> [Корневой документ wiki](../README.md)

## Цель

Подключить реферальную программу и систему лояльности к реальному successful purchase flow.

## Результат

- referral bonus начисляется после оплаченного и выполненного заказа;
- referral settings читаются из `SystemSettings`, а не только из env/default;
- loyalty level пересчитывается после изменения `totalSpent`;
- cashback, referral bonus и loyalty level update имеют явный порядок side effects в одном purchase lifecycle;
- клиентские баги 1.5 и 1.8 из [../info/bug-resolution.md](../info/bug-resolution.md) переведены из `confirmed-gap/partially-fixed` в проверяемое состояние.

## Оценка

Высокий продуктовый приоритет: это влияет на деньги, скидки и пользовательскую мотивацию.

## Зависит от

- [phase-2-runtime-verification.md](./phase-2-runtime-verification.md)
- желательно после [phase-3-admin-auth-and-api-security.md](./phase-3-admin-auth-and-api-security.md), если будут меняться admin settings flows

## Пререквизиты

- локальная БД с тестовыми users/orders;
- понятный статус, который считается successful paid order;
- подтверждённые поля referral/loyalty в Prisma schema и services;
- проверен текущий call graph вокруг `OrdersService.fulfillOrder()`, `PaymentsService` и `CloudPaymentsService`, чтобы не дублировать side effects в нескольких местах.

## Архитектурные решения

- Начисления должны происходить идемпотентно: повторный webhook или повторный fulfill не должен начислять бонус дважды.
- Runtime-настройки, изменяемые из админки, должны читаться из `SystemSettings`.
- Loyalty discount и loyalty level update должны иметь чёткий порядок: скидка применяется к текущему уровню до покупки, новый уровень рассчитывается после успешной покупки.
- Top-up заказы нужно отдельно классифицировать: входят ли они в `totalSpent`, cashback и referral bonus, или бизнес-логика должна исключать их.
- Источник истины для completion boundary должен быть один: если side effect вешается на `fulfillOrder()`, нельзя параллельно дублировать его в webhook handlers.

## Шаги (журналы)

- [Шаг 1. Зафиксировать purchase completion boundary](./phase-4/step-1-purchase-completion-boundary.md)
- [Шаг 2. Подключить referral bonus awarding](./phase-4/step-2-referral-bonus-awarding.md)
- [Шаг 3. Подключить loyalty level recalculation](./phase-4/step-3-loyalty-level-recalculation.md)
- [Шаг 4. Добавить backend tests или сценарные smoke-checks](./phase-4/step-4-backend-tests-smoke-checks.md)
- [Шаг 5. Обновить bug tracker и wiki](./phase-4/step-5-bug-tracker-wiki.md)

## Верификация

- Приглашённый пользователь завершает paid order, referrer получает ровно один bonus transaction.
- Изменение referral percent в admin settings влияет на следующее начисление без изменения env.
- После successful order `User.totalSpent` растёт, а loyalty level пересчитывается.
- Повторный вызов webhook/fulfill не создаёт повторный referral bonus.


## Журнал

- **[2026-05-07] Аудит текущего состояния:**
  - `OrdersService.fulfillOrder()` уже выполняет completion-side effects: переводит заказ в `COMPLETED`, начисляет cashback и увеличивает `User.totalSpent`.
  - `LoyaltyService.updateUserLevel()` существует, но не вызывается из purchase flow после роста `totalSpent`.
  - `ReferralsService.awardReferralBonus()` существует, но не найден в call graph purchase/payment flows и читает `REFERRAL_BONUS_PERCENT` из `ConfigService`, а не из `SystemSettings`.
  - `SystemSettingsService` уже умеет хранить `REFERRAL_BONUS_PERCENT`, `REFERRAL_MIN_PAYOUT`, `REFERRAL_ENABLED`, поэтому задача фазы не в создании настроек, а в их runtime wiring.
  - Перед реализацией нужно отдельно решить политику для top-up заказов и обеспечить идемпотентность при повторных payment callbacks.


## Ссылки на ранее созданные фазы и шаги, которые нужно учитывать при разработке этой фазы и ссылка назад на главный файл фазы из каждого шага.

- [Корневой документ wiki](../README.md)
