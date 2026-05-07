# Phase 7: Product Catalog Sync & Tariff Metadata

> [Корневой документ wiki](../README.md)

## Цель

Сделать каталог тарифов понятным пользователю и управляемым для админа: отличия похожих тарифов, теги, заметки и provider sync.

## Результат

- client/admin отображают `tags`, `notes`, `region` и важные ограничения тарифа;
- похожие тарифы различимы в UI;
- provider sync имеет понятное поведение: dry-run/preview или реальный upsert;
- баг 1.1 из [../info/bug-resolution.md](../info/bug-resolution.md) закрыт или разбит на конкретные product data tasks.

## Оценка

Средний продуктовый приоритет: влияет на выбор тарифа и снижает ошибки покупки.

## Зависит от

- [phase-2-runtime-verification.md](./phase-2-runtime-verification.md)
- [phase-3-admin-auth-and-api-security.md](./phase-3-admin-auth-and-api-security.md), если меняются admin write operations

## Пререквизиты

- подтверждённый список текущих products в БД;
- понимание, какие тарифы считаются дублями, а какие отличаются IP/region/provider terms;
- доступ к provider catalog, если реализуется sync.

## Архитектурные решения

- Тарифные отличия должны быть частью данных каталога, а не захардкоженным текстом в UI.
- Массовый provider sync не должен молча менять цены и названия без preview/audit trail.
- `syncProducts()` должен либо честно называться preview, либо выполнять upsert в `EsimProduct`.

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

- 


## Ссылки на ранее созданные фазы и шаги, которые нужно учитывать при разработке этой фазы и ссылка назад на главный файл фазы из каждого шага.

- [Корневой документ wiki](../README.md)
