# CloudPayments Runbook

> [Корневой документ wiki](../README.md)

> Короткий practical runbook по настройке CloudPayments для текущего runtime.

## Нужные уведомления

Для текущей реализации нужны:

- `Check`
- `Pay`
- `Fail`

Именно под них в backend есть обработчики:

- `POST /api/payments/cloudpayments/check`
- `POST /api/payments/cloudpayments/pay`
- `POST /api/payments/cloudpayments/fail`

## Что сейчас не используется приложением

Текущий checkout runtime не зависит от:

- `Confirm`
- `Refund`
- `Receipt`
- `Cancel`
- `Recurrent`
- `SbpToken`
- `Kkt`

Это не значит, что их нельзя включить в кабинете вообще, но backend-логика покупки eSIM на них не завязана. Если включать дополнительные уведомления, нужно сначала отдельно решить, нужен ли для них code path.

## Обязательные проверки в кабинете

Перед rollout:

- сайт/терминал соответствует нужному окружению;
- test mode и production mode не перепутаны;
- URL для `Check/Pay/Fail` указывают на правильный backend domain;
- HMAC secret в CloudPayments и `CLOUDPAYMENTS_API_SECRET` совпадают;
- public id в frontend и terminal id для нужного окружения не перепутаны.

## Callback expectations

### Check

Назначение:

- проверить order existence;
- проверить amount;
- отклонить заведомо протухшую payment session.

Для expired session backend возвращает отказной код и не даёт продолжать checkout как будто он свежий.

### Pay

Назначение:

- зафиксировать успешную оплату;
- перевести order в `PAID`;
- вызвать fulfillment.

Late `Pay` разрешено принимать только для order, который был auto-expired по policy `Payment session expired`.

### Fail

Назначение:

- отметить неуспешную оплату;
- release bonus hold, если он существовал.

## Test Mode

Официальная документация CloudPayments разрешает использовать test cards в test mode без реального списания.

Практический минимум для smoke:

- success card;
- insufficient funds card;
- 3DS и non-3DS варианты.

Документация:

- https://developers.cloudpayments.ru/
- https://developers.cloudpayments.ru/en/

## Ограничение

CloudPayments test mode полезен для staging/manual smoke, но не заменяет unit tests и не даёт полностью детерминированного in-repo automation:

- widget живёт во внешнем iframe;
- callback delivery идёт через внешний провайдер;
- 3DS path зависит от внешнего browser/provider flow.
