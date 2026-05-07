# Legacy Documentation Audit

> [Корневой документ wiki](../README.md)

## Итог

Корневые markdown-файлы нельзя использовать как единый source of truth. Они описывают несколько разных состояний проекта: ранний MVP, промежуточную интеграцию и более поздние доработки под Mojo mobile.

После `Phase 1` часть из них уже переведена в archival mode или переписана, но этот аудит оставлен как запись о найденных расхождениях.

## Сводка по файлам

| Файл | Статус | Что подтверждается кодом | Что устарело или конфликтует |
|---|---|---|---|
| `README.md` | Частично актуален | monorepo, NestJS backend, admin, bot, Prisma, Swagger | называет архитектуру микросервисной; слабо описывает отдельный `client`; ссылается на `.env.example`, которого нет |
| `docs/archive/architecture.md` | Частично актуален | NestJS, PostgreSQL, Prisma, admin, bot, модульная бизнес-логика | платежный провайдер и часть модулей описаны неполно; отсутствуют `client`, promo-codes, notifications, phone/OAuth auth |
| `docs/operations/setup.md` | Актуализирован | docker-compose, `pnpm dev`, миграции, seed как идея | поддерживать вместе с runtime changes |
| `docs/operations/deployment.md` | Актуализирован | Railway/autodeploy baseline, env keys, migration policy | production readiness всё ещё требует ручной проверки |
| `docs/archive/project-summary.md` | Сильно устарел | наличие backend/admin/bot/docs | содержит маркетинговые и технические утверждения "100% готово", которые код не подтверждает |
| `docs/archive/final-checklist.md` | Сильно устарел | общая идея модульности | множество утверждений о готовности и синхронизации не соответствуют реальному состоянию UI/API |
| `docs/archive/ready-to-launch.md` | Сильно устарел | наличие основных подсистем | повторяет недостоверное утверждение про 100% готовность |
| `docs/archive/sync-check.md` | Частично актуален исторически | endpoint `users/find-or-create` действительно существует | документ отражает момент локальной правки, а не текущее полное состояние системы |
| `docs/archive/esim-provider-integration.md` | Устарел | в коде остался legacy-слой под eSIM Go/fallback | фактический primary flow теперь идёт через eSIM Access |
| `docs/integrations/esim-access.md` | Актуализирован | eSIM Access provider реально существует | credentials удалены; git history всё ещё нужно считать потенциальным источником утечки |

## Ключевые найденные расхождения

### Архитектура

- В старых текстах проект называется микросервисным, но по коду это monorepo с одним backend API.
- В старых текстах почти нет описания `client`, хотя это крупный production-like интерфейс.

### Платежи

- В документации фигурируют ЮKassa, затем Robokassa, затем CloudPayments.
- В текущем коде одновременно живут CloudPayments и Robokassa.

### eSIM provider

- Старые документы называют primary provider `eSIM Go`.
- Текущий рабочий путь в коде начинается с `eSIM Access`, а `eSIM Go` остался как legacy compatibility branch.

### Auth

- Старые документы сводят вход в основном к Telegram/admin auth.
- По коду есть phone OTP, OAuth через Google/Yandex/VK, Telegram widget и Telegram WebApp auth.

### Admin

- Старые документы создают впечатление полноценной admin auth модели.
- Реальный frontend admin сейчас открывается по PIN-коду в `localStorage`.

### Config and setup

- Несколько документов требуют `.env.example`, но файл отсутствует.
- Часть env key names в документации не совпадает с тем, что читает `ConfigService` в коде.

## Что делать дальше

- Новые сессии должны стартовать с `docs/README.md` и текущей architecture wiki.
- Legacy-файлы в корне нужно либо переписать, либо пометить как archival.
- Отдельной задачей стоит убрать исторические секреты из git history, если они уже попадали в репозиторий.
