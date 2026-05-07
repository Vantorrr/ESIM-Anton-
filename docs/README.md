# LLM Wiki Entry Point

> [Корневой документ wiki](./README.md)

> Главный вход в проектную wiki после аудита унаследованного репозитория.

## С чего начинать

1. [phases/README.md](./phases/README.md)
   Здесь текущий статус работ по приведению проекта в управляемое состояние.
2. [architecture/README.md](./architecture/README.md)
   Здесь подтвержденная карта системы и аудит старой документации.

## Что изменилось относительно шаблона

- `docs/architecture/` теперь описывает реальный код, а не абстрактный шаблон.
- Пользовательская документация перенесена из корня в системные разделы `docs/operations/`, `docs/integrations/`, `docs/archive/`.

## Быстрая навигация

### Нужно быстро понять, что за система

- [architecture/system-overview.md](./architecture/system-overview.md)
- [architecture/module-map.md](./architecture/module-map.md)
- [info/proect.md](./info/proect.md)
  Историческое продуктово-инфраструктурное описание, из которого видно, что `main` в GitHub запускает Railway autodeploy.
- [info/bug-resolution.md](./info/bug-resolution.md)
  Текущий статус клиентских багов из `docs/info/bagi.md`.

### Нужно понять, можно ли доверять старым markdown-файлам

- [architecture/legacy-doc-audit.md](./architecture/legacy-doc-audit.md)
- [architecture/codebase-audit.md](./architecture/codebase-audit.md)

### Нужно запускать или сопровождать проект

- [operations/README.md](./operations/README.md)
- [operations/setup.md](./operations/setup.md)
- [operations/deployment.md](./operations/deployment.md)
- [operations/railway-runbook.md](./operations/railway-runbook.md)
- [architecture/runtime-and-operations.md](./architecture/runtime-and-operations.md)
- [architecture/gotchas.md](./architecture/gotchas.md)
- [architecture/railway-production-baseline.md](./architecture/railway-production-baseline.md)

### Нужно понять внешние интеграции

- [integrations/README.md](./integrations/README.md)
- [integrations/esim-access.md](./integrations/esim-access.md)

### Нужен архив старых документов

- [archive/README.md](./archive/README.md)

### Нужно понять текущую фазу работ

- [phases/phase-0-wiki-bootstrap-and-audit.md](./phases/phase-0-wiki-bootstrap-and-audit.md)

## Source of truth

При конфликте документов:

1. код и Prisma schema;
2. wiki в `docs/architecture/`;
3. runbooks в `docs/operations/`;
4. архивные документы в `docs/archive/`.
