# Guidelines

> [Корневой документ wiki](../README.md)

## Как читать проект

- Начинать с `docs/README.md`, затем `docs/architecture/system-overview.md`.
- Любое утверждение из корневых markdown-файлов перепроверять по коду.

## Что считать архитектурным baseline

- Backend — модульный NestJS monolith.
- `admin`, `client`, `bot` — разные клиенты над одним API.
- Prisma schema и controller/service код важнее старых чеклистов и summary-документов.

## Как обновлять wiki дальше

- При добавлении backend-модуля обновлять `module-map.md`.
- При изменении платежного, auth или provider flow обновлять `system-overview.md` и `runtime-and-operations.md`.
- При нахождении нового расхождения между legacy docs и кодом добавлять запись в `legacy-doc-audit.md` или `gotchas.md`.

## Что не делать

- Не ссылаться на корневые документы как на source of truth без явной пометки `legacy`.
- Не документировать production readiness, если это не подтверждено кодом и реальной верификацией.
