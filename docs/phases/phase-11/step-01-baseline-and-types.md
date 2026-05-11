# Step 01 — Baseline, API inventory и типизация

> [⬅️ Phase 11](../phase-11-admin-panel-refactoring.md)

## Цель

Зафиксировать baseline, инвентаризировать реальные API response shapes, сверить их с backend DTO/contracts, создать типы и устранить `any`.

## Что нужно сделать

### 1.1 Baseline
- Запустить `npm run build` в `admin/` — задокументировать ошибки/warnings.
- Запустить ESLint — задокументировать warnings.
- Удалить из `package.json`: `@tanstack/react-query`, `@tanstack/react-table` (подтверждено: 0 imports).

### 1.2 API Response Inventory
Перед типизацией — составить карту реальных response shapes из `api.ts` и подтвердить их по backend source of truth:

**Source of truth order для inventory:**
1. Реальные backend controller/service DTO и response wrappers в коде `backend/`.
2. Фактическое использование этих ответов в `admin/lib/api.ts` и текущих admin components.
3. Wiki/phase notes как вспомогательный контекст, но не как первичный контракт.

**Обязательное правило:** inventory нельзя утверждать только по текущему frontend consumption pattern. Если `admin` сейчас читает `response.data`, `response.data.data` и `response.data.products`, это нужно сверить с backend endpoint implementation и явно отметить как:
- подтверждённый backend contract;
- legacy inconsistency, которую нужно сохранить во frontend adapter слое;
- или технический долг, который требует follow-up после Phase 11.

Инвентаризация **обязана покрыть все export-группы и все методы** из `admin/lib/api.ts`, а не только выборочные примеры ниже.

| API group | Methods / endpoints | Что зафиксировать |
|---|---|---|
| `authApi` | `login()` | request DTO, backend response DTO/wrapper, token field name |
| `dashboardApi` | `getStats()` | relation к `analytics/dashboard`, backend shape stats/wrapper |
| `usersApi` | `getAll()`, `getById()`, `getStats()` | paginated vs direct object patterns, backend pagination contract |
| `ordersApi` | `getAll()`, `getById()`, `getByUser()`, `cancel()` | list wrapper, entity shape, mutation response, backend status field names |
| `productsApi` | `getAll()`, `getCountries()`, `create()`, `update()`, `sync()`, `repriceAll()`, `bulkToggleActive()`, `bulkToggleByType()`, `bulkSetBadge()`, `bulkSetMarkup()`, `dedupe()` | list wrapper, countries array, request DTOs, mutation response patterns, inconsistent wrappers если есть |
| `paymentsApi` | `getAll()`, `getByUser()` | paginated vs direct list patterns, backend list wrapper |
| `analyticsApi` | `getDashboard()`, `getTopProducts()`, `getSalesChart()` | inline analytics shapes, chart payloads, optional params, backend response contract |
| `referralsApi` | `getStats()`, `getTop()` | direct object/list patterns, backend wrapper/no-wrapper policy |
| `loyaltyApi` | `getLevels()`, `createLevel()`, `updateLevel()`, `deleteLevel()` | direct array vs wrapped response, request DTOs, mutation responses |
| `promoCodesApi` | `getAll()`, `create()`, `toggle()`, `delete()` | promo entity shape, request DTOs, mutation responses, backend toggle payload |
| `systemSettingsApi` | `getAll()`, `getReferralSettings()`, `updateReferralSettings()`, `getPricingSettings()`, `updatePricingSettings()`, `getExchangeRateInfo()`, `updateExchangeRateFromCBR()`, `setExchangeRateAutoUpdate()` | mixed settings shapes, request DTOs, exchange-rate response patterns, backend success/message fields |

Результат: markdown-таблица с точными shapes для **каждого endpoint и каждого метода** в `api.ts`, включая request DTO, backend response wrapper, notable inconsistencies и решение по каждому расхождению.

Для каждого endpoint inventory обязан зафиксировать:
- путь и HTTP method;
- backend controller/DTO source;
- request DTO shape;
- response success shape;
- response wrapper (`data`, direct array/object, pagination meta, `message`, `success`);
- поля, которые реально использует admin;
- расхождения между backend contract и текущим frontend consumption;
- выбранную стратегию: align frontend types directly, ввести typed adapter, или оставить legacy compatibility note.

### 1.3 Типизация
- Создать `admin/lib/types.ts` на основе inventory:
  - Entities: `AdminProduct`, `AdminOrder`, `AdminUser`, `LoyaltyLevel`, `PromoCode`, `DashboardStats`
  - DTOs: `CreateProductDto`, `UpdateProductDto`, `OrdersQueryParams`, `CreateLoyaltyLevelDto`, `PricingSettings`, `ReferralSettings`
  - Response wrappers: `PaginatedResponse<T>`, `ApiListResponse<T>` (если есть разные patterns)
  - Enums: `OrderStatus`
- Перенести inline-типы из `Dashboard.tsx`, `PromoCodes.tsx`, `Settings.tsx`.
- Типизировать `api.ts`: параметры `any` → конкретные типы.
- Если backend contracts неоднородны, зафиксировать это в typed adapter/helper слое, а не размазывать knowledge о `response.data?.data || response.data?.products` по page-компонентам.
- Заменить `useState<any>` / `useState<any[]>` в компонентах.

## Результат шага

- Baseline build/lint задокументирован.
- Dead dependencies удалены.
- API response inventory составлен — каждый endpoint имеет задокументированный shape и backend source reference.
- API response inventory покрывает все export-группы и методы из `admin/lib/api.ts`, без пропусков.
- Inventory не опирается только на frontend usage; все shape decisions сверены с backend DTO/controller contracts.
- `admin/lib/types.ts` покрывает все endpoints из `api.ts`.
- Поиск по коду не возвращает `: any` в `admin/lib/api.ts`.
- `npm run build` проходит.

## Зависимости

Нет.

## Статус

`planned`

## Файлы

- `admin/package.json` — удаление dead deps
- `admin/lib/types.ts` — [NEW]
- `admin/lib/api.ts` — типизация параметров и возвратов
- `admin/components/Dashboard.tsx` — перенос inline-типов
- `admin/components/PromoCodes.tsx` — перенос inline-типов
- `admin/components/Settings.tsx` — перенос inline-типов
- `admin/components/Products.tsx` — `useState<any>` → typed
- `admin/components/Orders.tsx` — `useState<any>` → typed

## Тестирование / Верификация

- `npm run build` проходит без ошибок.
- Inventory markdown/table покрывает все export-группы из `admin/lib/api.ts` и для каждого endpoint содержит backend source reference.
- Для каждого случая несовпадения frontend usage и backend contract зафиксировано решение: direct alignment, typed adapter или legacy follow-up note.
- Поиск по коду не возвращает `: any` в `admin/lib/api.ts`.
- Поиск по коду не возвращает `useState<any` в `admin/components/*.tsx`.
- `npm install` проходит после удаления deps.
- Dev server: все компоненты рендерятся без runtime-ошибок (smoke test).
