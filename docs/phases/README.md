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
  - Заменить browser-side PIN как единственный барьер на backend admin JWT.
  - Закрыть write/admin endpoints через `JwtAdminGuard`.
  - Проверить, что unauthenticated write-запросы получают `401/403`.
  - Документ: [phase-3-admin-auth-and-api-security.md](./phase-3-admin-auth-and-api-security.md)

- [ ] **Phase 4: Loyalty & Referral Wiring**
  - Подключить реферальные бонусы к successful purchase flow.
  - Подключить пересчёт loyalty level после оплаченного заказа.
  - Синхронизировать admin settings `SystemSettings` с runtime-логикой.
  - Документ: [phase-4-loyalty-and-referral-wiring.md](./phase-4-loyalty-and-referral-wiring.md)

- [ ] **Phase 5: eSIM Usage, Status & Activation**
  - Проверить usage/status на реальном eSIM Access заказе.
  - Довести отображение расхода трафика, статусов и activation links.
  - Проверить low-traffic notification в Telegram bot.
  - Документ: [phase-5-esim-usage-status-and-activation.md](./phase-5-esim-usage-status-and-activation.md)

- [ ] **Phase 6: Admin Orders, Analytics & Reporting**
  - Доработать таблицу заказов: promo/final paid amount/sorting/export.
  - Исправить analytics расчёты по фактически оплаченным заказам.
  - Зафиксировать delete policy для admin rows.
  - Документ: [phase-6-admin-orders-analytics-and-reporting.md](./phase-6-admin-orders-analytics-and-reporting.md)

- [ ] **Phase 7: Product Catalog Sync & Tariff Metadata**
  - Довести отображение `tags`, `notes`, `region` и отличий похожих тарифов.
  - Превратить provider sync из preview/TODO в понятный upsert/dry-run flow.
  - Проверить дубли тарифов и UX выбора пакетов.
  - Документ: [phase-7-product-catalog-sync-and-tariff-metadata.md](./phase-7-product-catalog-sync-and-tariff-metadata.md)

- [ ] **Phase 8: Production Readiness & Railway Rollout**
  - Проверить Railway service commands и production env baseline.
  - Подготовить миграционный rollout без риска для существующей production DB.
  - Выполнить deploy только после прохождения предыдущих фаз.
  - Документ: [phase-8-production-readiness-and-railway-rollout.md](./phase-8-production-readiness-and-railway-rollout.md)
