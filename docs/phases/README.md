# Project Phases & Roadmap

> [Корневой документ wiki](../README.md)

> Актуальный roadmap по приведению унаследованного проекта к поддерживаемому состоянию.

## Текущий статус

- [x] **Phase 0: Wiki Bootstrap & Legacy Audit**
  - Собран baseline по коду.
  - Переписана architecture wiki.
  - Зафиксированы расхождения между старой документацией и реализацией.
  - Документ: [phase-0-wiki-bootstrap-and-audit.md](./phase-0-wiki-bootstrap-and-audit.md)

- [x] **Phase 1: Environment & Config Hardening**
  - Создан безопасный `.env.example`.
  - Секреты убраны из `docs/integrations/esim-access.md`.
  - Корневые setup/deploy/docs приведены к подтвержденному runtime.
  - Документ: [phase-1-environment-and-config-hardening.md](./phase-1-environment-and-config-hardening.md)

- [x] **Phase 2: Runtime Verification**
  - Поднять полный контур `backend + admin + client + bot`.
  - Проверить ключевые user/admin/payment/provider flows.
  - Закрыть расхождения между декларативной документацией и фактическим поведением.
  - Клиентские баги трекаются в [../info/bug-resolution.md](../info/bug-resolution.md).
  - Документ: [phase-2-runtime-verification.md](./phase-2-runtime-verification.md)

- [ ] **Phase 3: Admin Auth & API Security Hardening**
  - Перевести admin с frontend-only PIN на backend admin JWT flow.
  - Закрыть реальные write endpoints через `JwtAdminGuard`, не сломав существующие read flows.
  - Отдельно проверить незакрытые routes `products`, `promo-codes`, `system-settings`, `loyalty`, `users`, `payments`.
  - Документ: [phase-3-admin-auth-and-api-security.md](./phase-3-admin-auth-and-api-security.md)

- [x] **Phase 4: Loyalty & Referral Wiring**
  - Completion boundary сведена к `OrdersService.fulfillOrder()` для card, balance и free-order purchase flows.
  - Referral bonus подключён к completed purchase, читает runtime settings из `SystemSettings` и защищён от повторного начисления по `orderId`.
  - После роста `totalSpent` выполняется пересчёт `loyaltyLevel`; top-up flow отдельно исключён из этих side effects.
  - Документ: [phase-4-loyalty-and-referral-wiring.md](./phase-4-loyalty-and-referral-wiring.md)

- [ ] **Phase 5: eSIM Usage, Status & Activation**
  - Подтвердить реальный provider contract для `getEsimSnapshot()` и `purchaseEsim()` на контролируемом заказе.
  - Довести единый lifecycle `backend -> client -> bot` для usage, статусов, LPA/QR и top-up readiness.
  - Проверить low-traffic monitoring cron и Telegram delivery на реальном или воспроизводимом сценарии.
  - Документ: [phase-5-esim-usage-status-and-activation.md](./phase-5-esim-usage-status-and-activation.md)

- [ ] **Phase 6: Admin Orders, Analytics & Reporting**
  - Доработать admin orders table, которая пока показывает только базовые поля без promo/discount/export.
  - Вынести формулу `paid revenue` и проверить, что dashboard/analytics не расходятся с business definition.
  - Зафиксировать policy для cancel/delete без потери audit trail.
  - Документ: [phase-6-admin-orders-analytics-and-reporting.md](./phase-6-admin-orders-analytics-and-reporting.md)

- [ ] **Phase 7: Product Catalog Sync & Tariff Metadata**
  - Сверить catalog metadata с уже существующим `ProductsService.syncWithProvider()` и dedupe flow.
  - Довести отображение `tags`, `notes`, `region`, `supportTopup` и различий похожих тарифов в client/admin.
  - Зафиксировать безопасные semantics для sync/reprice/dedupe и закрыть их backend auth.
  - Документ: [phase-7-product-catalog-sync-and-tariff-metadata.md](./phase-7-product-catalog-sync-and-tariff-metadata.md)

- [ ] **Phase 8: Production Readiness & Railway Rollout**
  - Подтвердить Railway service-level commands и env baseline до любых deploy-sensitive изменений.
  - Подготовить rollout для уже существующей production DB с baseline migration `20260507_init`.
  - Выполнять controlled deploy только после завершения security/business-critical фаз и smoke-checklist.
  - Документ: [phase-8-production-readiness-and-railway-rollout.md](./phase-8-production-readiness-and-railway-rollout.md)
