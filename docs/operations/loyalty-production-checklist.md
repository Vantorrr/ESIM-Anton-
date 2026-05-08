# Loyalty Production Checklist

> [Корневой документ wiki](../README.md)

Короткий checklist для rollout и smoke-проверки системы лояльности.

## Перед деплоем

- Подтвердить, что `backend` tests зелёные:
  - `npx jest src/modules/loyalty/loyalty.controller.spec.ts src/modules/orders/orders.service.spec.ts --runInBand`
- Подтвердить, что `backend` typecheck зелёный:
  - `npx tsc --noEmit -p tsconfig.json`
- Подтвердить, что loyalty CRUD не открыт наружу и требует admin auth.

## После деплоя

### Admin smoke

- Открыть админку и вкладку loyalty settings.
- Проверить загрузку уровней.
- Проверить create/update/delete уровня с валидными значениями.
- Проверить, что не-admin token не получает доступ к loyalty routes.
- Проверить, что duplicate `name` и duplicate `minSpent` отклоняются с `400`.

### Purchase smoke

- Открыть `/loyalty` под обычным user JWT.
- Проверить, что экран показывает текущий уровень, cashback, discount и следующий порог.
- Проверить тот же сценарий в Telegram Mini App cold start.
- После admin edit уровня проверить, что `/loyalty` и новый checkout используют одинаковые discount/cashback semantics.
- Взять пользователя с известным `loyaltyLevel`.
- Создать обычный order и проверить, что discount уровня попадает в расчёт заказа.
- Завершить purchase и проверить, что cashback начисляется в `bonusBalance`.
- Проверить, что создаётся `BONUS_ACCRUAL` с metadata `source: loyalty_cashback`.
- Проверить рост `User.totalSpent`.

### Level transition smoke

- Провести покупку, которая переводит пользователя через порог `minSpent`.
- Проверить, что после покупки `loyaltyLevel` изменился.
- Проверить следующую покупку: она должна использовать уже новый `discount` и `cashbackPercent`.
- Удалить один из промежуточных уровней и проверить, что пользователи сразу reassigned на подходящий уровень.

### Exclusion smoke

- Провести top-up заказ.
- Проверить, что top-up не меняет `totalSpent`.
- Проверить, что top-up не начисляет cashback.
- Проверить, что top-up не меняет `loyaltyLevel`.

## Что мониторить

- `401/403` на loyalty admin routes
- неожиданные изменения `loyaltyLevelId`
- расхождение между `/loyalty` и фактическим pricing/cashback в checkout
- отсутствие `BONUS_ACCRUAL` после успешной покупки
- рост `totalSpent` на top-up сценариях
