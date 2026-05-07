# Phase 7: Product Catalog Sync & Tariff Metadata

> [Корневой документ wiki](../README.md)

## Цель

Сделать каталог тарифов понятным пользователю и управляемым для админа: отличия похожих тарифов, теги, заметки, coverage metadata и безопасный provider sync lifecycle.

## Результат

- client/admin отображают `tags`, `notes`, `region` и важные ограничения тарифа;
- похожие тарифы различимы в UI;
- provider sync имеет документированное поведение: что именно обновляется, что сохраняется вручную и какие операции требуют отдельного dry-run;
- операции `sync`, `reprice`, `dedupe`, bulk edit имеют согласованную auth policy и операторские ограничения;
- баг 1.1 из [../info/bug-resolution.md](../info/bug-resolution.md) закрыт или разбит на конкретные product data tasks.

## Оценка

Средний продуктовый приоритет: влияет на выбор тарифа и снижает ошибки покупки.

## Зависит от

- [phase-2-runtime-verification.md](./phase-2-runtime-verification.md)
- [phase-3-admin-auth-and-api-security.md](./phase-3-admin-auth-and-api-security.md), потому что текущие `sync/reprice/bulk-*` endpoints используются как admin operations, но не все закрыты backend auth

## Пререквизиты

- подтверждённый список текущих products в БД;
- понимание, какие тарифы считаются дублями, а какие отличаются IP/region/provider terms;
- доступ к provider catalog, если перепроверяется sync;
- подтверждено текущее поведение `ProductsService.syncWithProvider()`, `dedupeProducts()` и manual metadata editing в admin.

## Архитектурные решения

- Тарифные отличия должны быть частью данных каталога, а не захардкоженным текстом в UI.
- Массовый provider sync не должен молча менять цены и названия без preview/audit trail.
- Источником истины для catalog sync является текущий `ProductsService.syncWithProvider()`, а не legacy-метод `EsimProviderService.syncProducts()`.
- Phase 7 должна явно развести три типа операций: provider sync, pricing reprice и duplicate cleanup. У них разные риски и разные требования к preview/rollback.

## Шаги (журналы)

- [Шаг 1. Провести catalog data audit](./phase-7/step-1-catalog-data-audit.md)
- [Шаг 2. Доработать product display в client](./phase-7/step-2-product-display-client.md)
- [Шаг 3. Доработать product display/editing в admin](./phase-7/step-3-product-display-editing-admin.md)
- [Шаг 4. Определить и реализовать provider sync semantics](./phase-7/step-4-provider-sync-semantics.md)
- [Шаг 5. Проверить UX выбора тарифов](./phase-7/step-5-ux.md)

## Верификация

- Два похожих тарифа различимы в client без чтения админки.
- Admin видит и редактирует tariff metadata.
- Provider sync не меняет каталог без понятного preview/apply результата.
- Product list после sync не создаёт неконтролируемые дубли.


## Журнал

- **[2026-05-07] Аудит текущего состояния:**
  - Client и admin уже используют `tags`, `notes`, `region`, `badge`, `supportTopup`; проблема не в отсутствии полей, а в качестве данных и в различимости похожих тарифов.
  - `ProductsService.syncWithProvider()` уже делает реальный upsert в `EsimProduct`, тянет standard/day-pass пакеты, обновляет provider fields и сохраняет часть ручных metadata (`ourPrice`, `isActive`, `badge`, `tags`, `notes`).
  - `ProductsController` при этом оставляет `POST /products/sync`, `reprice` и bulk routes без `JwtAdminGuard`, поэтому у Phase 7 есть явная зависимость от Phase 3.
  - `dedupeProducts()` уже существует и умеет `dryRun`, но `sync` пока не имеет отдельного preview/audit trail и может сразу менять каталог по ответу провайдера.
  - Основная цель фазы смещена: не “написать sync с нуля”, а уточнить semantics существующего sync/reprice/dedupe контура, закрыть его auth и привести catalog UX к данным, которые реально уже есть в БД.


## Ссылки на ранее созданные фазы и шаги, которые нужно учитывать при разработке этой фазы и ссылка назад на главный файл фазы из каждого шага.

- [Корневой документ wiki](../README.md)
