# Шаг 5. Обновить bug tracker и wiki

> [⬅️ Назад к фазе](../phase-4-loyalty-and-referral-wiring.md)

## Цель

Синхронизировать документацию с поведением кода.

## Что нужно сделать

- обновить [../../info/bug-resolution.md](../../info/bug-resolution.md);
- добавить gotcha/ADR, если выбран особый порядок начислений;
- обновить runtime docs, если нужны новые env/settings.

## Результат шага

Новая сессия видит не только код, но и правила начислений.

## Статус

Завершено
- Обновлён `docs/info/bug-resolution.md`: баг 1.8 переведён в `fixed`, баг 1.5 оставлен `partially-fixed`, но теперь с отражением реального purchase awarding.
- В `docs/architecture/gotchas.md` добавлена заметка про completion boundary: purchase side effects висят на `fulfillOrder()`, а top-up намеренно исключён.
- Главный документ фазы и roadmap синхронизированы с фактическим кодом, тестами и принятым порядком side effects.
## Журнал изменений
- [docs/info/bug-resolution.md](../../info/bug-resolution.md)
- [docs/architecture/gotchas.md](../../architecture/gotchas.md)
- [docs/phases/README.md](../README.md)
- [docs/phases/phase-4-loyalty-and-referral-wiring.md](../phase-4-loyalty-and-referral-wiring.md)
- 
- Проверка ссылок и журналов выполнена вручную после обновления markdown.
## Файлы

- 

## Тестирование / Верификация

- 
