# Phase 1: Environment & Config Hardening

> [Корневой документ wiki](../README.md)

## Цель

Привести конфигурацию и корневую документацию репозитория к состоянию, в котором новая команда не будет поднимать проект по ложным инструкциям и не утащит секреты из git.

## Результат

- создан актуальный `.env.example` по фактическим env keys из кода;
- секреты удалены из `docs/integrations/esim-access.md`;
- `README.md`, `docs/operations/setup.md`, `docs/operations/deployment.md` переписаны под подтвержденный runtime;
- legacy summary/checklist документы помечены как архивные, чтобы не конкурировать с wiki.

## Оценка

Низкий риск по коду, высокий выигрыш по operational clarity и безопасности.

## Зависит от

- [phase-0-wiki-bootstrap-and-audit.md](./phase-0-wiki-bootstrap-and-audit.md)

## Пререквизиты

- нужно собрать env keys из `backend`, `admin`, `client`, `bot`;
- нельзя использовать реальные `.env` файлы как источник.

## Архитектурные решения

- source of truth по конфигу теперь задаётся `.env.example` плюс код;
- legacy-документы не удаляются, но лишаются статуса актуальной документации;
- реальные credentials не документируются в репозитории.

## Шаги (журналы)

### Шаг 1. Собрать env surface

### Цель

Подтвердить, какие переменные окружения реально читаются кодом.

### Что нужно сделать

- проверить `process.env.*` и `configService.get(...)` по всем пакетам;
- свести переменные в один baseline.

### Результат шага

Получен фактический набор env keys для backend, admin, client и bot.

### Шаг 2. Санитизировать документацию

### Цель

Убрать секреты и убрать из корня ложные operational инструкции.

### Что нужно сделать

- переписать интеграционный eSIM Access документ без credentials;
- обновить `README.md`, setup и deployment документы;
- пометить summary/checklist файлы как legacy.

### Результат шага

Корневая документация больше не конфликтует с wiki и не хранит секреты.

## Верификация

- `.env.example` существует в корне;
- в `docs/integrations/esim-access.md` нет реальных ключей, логинов и паролей;
- `README.md`, `docs/operations/setup.md`, `docs/operations/deployment.md` указывают на реальные пакеты и порты;
- legacy-файлы не выдают себя за актуальный source of truth.
