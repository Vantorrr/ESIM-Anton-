# Phase 8: Production Readiness & Railway Rollout

> [Корневой документ wiki](../README.md)

## Цель

Подготовить безопасную выкладку изменений в production с учётом GitHub -> Railway autodeploy.

## Результат

- Railway service commands и env baseline проверены;
- migration baseline не ломает существующую production DB;
- payment/provider/webhook secrets сверены по checklist без записи секретов в git;
- задокументировано, какие изменения можно безопасно пушить в `main`, а какие требуют отдельного rollout window;
- deploy выполняется только после явного решения о rollout.

## Оценка

Высокий operational риск: push в GitHub может автоматически запустить Railway deploy.

## Зависит от

- [phase-3-admin-auth-and-api-security.md](./phase-3-admin-auth-and-api-security.md)
- [phase-4-loyalty-and-referral-wiring.md](./phase-4-loyalty-and-referral-wiring.md)
- [phase-5-esim-usage-status-and-activation.md](./phase-5-esim-usage-status-and-activation.md)
- [phase-6-admin-orders-analytics-and-reporting.md](./phase-6-admin-orders-analytics-and-reporting.md)
- [phase-7-product-catalog-sync-and-tariff-metadata.md](./phase-7-product-catalog-sync-and-tariff-metadata.md)
- [../operations/railway-runbook.md](../operations/railway-runbook.md)

## Пререквизиты

- принято решение, какие фазы входят в ближайший deploy;
- есть доступ к Railway dashboard/logs;
- production env сверяется вручную по `.env.example`, без записи секретов в репозиторий;
- для существующей production DB выполнен или запланирован `prisma migrate resolve --applied 20260507_init`, если baseline уже соответствует схеме;
- отдельно подтверждено, какие сервисы реально живут в Railway, а какой deployment у `client/PWA` остаётся вне Railway.

## Архитектурные решения

- Нельзя менять root scripts вслепую, пока не проверены Railway service-level build/start commands.
- Production secrets документируются только как имена переменных и правила проверки, не как значения.
- Deploy не должен быть побочным эффектом обычного commit, если фаза не готова к автодеплою.
- Phase 8 не заменяет functional verification предыдущих фаз: она только собирает их в контролируемый rollout sequence.
- Для production rollout нужно проверять не только backend, но и связанный operational contour: admin, bot, callback URLs, Prisma baseline status и отдельно развернутый client/PWA.

## Шаги (журналы)

- [Шаг 1. Снять Railway service baseline](./phase-8/step-1-railway-service-baseline.md)
- [Шаг 2. Проверить production env checklist](./phase-8/step-2-production-env-checklist.md)
- [Шаг 3. Подготовить migration rollout](./phase-8/step-3-migration-rollout.md)
- [Шаг 4. Прогнать staging/smoke checklist](./phase-8/step-4-staging-smoke-checklist.md)
- [Шаг 5. Выполнить controlled deploy](./phase-8/step-5-controlled-deploy.md)

## Верификация

- Railway logs показывают успешный build/start.
- `prisma migrate deploy` не падает на существующей production DB.
- Critical API/UI flows отвечают после deploy.
- В [../operations/railway-runbook.md](../operations/railway-runbook.md) обновлены фактические команды и выводы rollout.


## Журнал

- **[2026-05-07] Аудит текущего состояния:**
  - Wiki уже содержит `railway-runbook.md` и `railway-production-baseline.md`, включая baseline flow для `20260507_init`.
  - Текущий контур автодеплоя остаётся чувствительным: `main` в GitHub подключён к Railway, поэтому push может немедленно затронуть production backend/admin/bot.
  - Не подтверждено из локального кода, какие именно service-level build/start commands стоят в Railway UI, поэтому эта фаза должна начинаться с фактического снятия baseline из dashboard, а не с редактирования `package.json` наугад.
  - Для `client` уже зафиксировано legacy-ограничение: PWA может выкатываться вне Railway. Это должно остаться явной частью rollout checklist, иначе можно ошибочно считать Phase 8 чисто backend/admin задачей.
  - Фаза готова к реализации как operational preparation phase, но не должна стартовать раньше завершения security и business-critical изменений из Phases 3-7.


## Ссылки на ранее созданные фазы и шаги, которые нужно учитывать при разработке этой фазы и ссылка назад на главный файл фазы из каждого шага.

- [Корневой документ wiki](../README.md)
