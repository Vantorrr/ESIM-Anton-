# Operations

> [Корневой документ wiki](../README.md)

Операционные инструкции по локальному запуску, деплою и Railway rollout.

## Документы

- [setup.md](./setup.md) — локальный запуск проекта.
- [deployment.md](./deployment.md) — production/deployment baseline.
- [railway-runbook.md](./railway-runbook.md) — практический порядок действий для Railway autodeploy.
- [local-user-auth-switch.md](./local-user-auth-switch.md) — как локально привязать login flow к существующему пользователю.
- [../architecture/railway-production-baseline.md](../architecture/railway-production-baseline.md) — подробный Prisma baseline для уже существующей Railway БД.

## Правило

Если инструкция касается production БД или Railway autodeploy, сначала читать [railway-runbook.md](./railway-runbook.md), затем детальный baseline-документ.
