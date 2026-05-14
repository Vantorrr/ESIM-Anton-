# Operations

> [Корневой документ wiki](../README.md)

Операционные инструкции по локальному запуску, деплою и Railway rollout.

## Документы

- [setup.md](./setup.md) — локальный запуск проекта.
- [deployment.md](./deployment.md) — production/deployment baseline.
- [railway-runbook.md](./railway-runbook.md) — практический порядок действий для Railway autodeploy.
- [cloudpayments-runbook.md](./cloudpayments-runbook.md) — какие CloudPayments callbacks реально нужны текущему runtime.
- [payment-production-checklist.md](./payment-production-checklist.md) — pre-deploy и post-deploy smoke checklist для checkout/payment chain.
- [local-user-auth-switch.md](./local-user-auth-switch.md) — как локально привязать login flow к существующему пользователю.
- [engagement-go-live-checklist.md](./engagement-go-live-checklist.md) — финальный go-live checklist для loyalty + referrals.
- [loyalty-production-checklist.md](./loyalty-production-checklist.md) — pre-deploy и post-deploy smoke checklist для loyalty runtime.
- [referral-production-checklist.md](./referral-production-checklist.md) — pre-deploy и post-deploy smoke checklist для referral runtime.
- [../architecture/railway-production-baseline.md](../architecture/railway-production-baseline.md) — подробный Prisma baseline для уже существующей Railway БД.

## Правило

Если инструкция касается production БД или Railway autodeploy, сначала читать [railway-runbook.md](./railway-runbook.md), затем детальный baseline-документ.
