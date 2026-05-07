# Phase 5: eSIM Usage, Status & Activation

> [Корневой документ wiki](../README.md)

## Цель

Довести пользовательский eSIM lifecycle: корректный статус, расход трафика, срок действия и activation links.

## Результат

- usage/status проверены на реальном eSIM Access заказе;
- client/bot показывают понятный статус eSIM;
- доступны QR, LPA/iOS/Android activation instructions или ссылки;
- low-traffic notification подтверждён на реальных или контролируемых provider данных.

## Оценка

Высокий продуктовый приоритет, но зависит от внешних credentials и реального provider response.

## Зависит от

- [phase-2-runtime-verification.md](./phase-2-runtime-verification.md)
- [../integrations/esim-access.md](../integrations/esim-access.md)

## Пререквизиты

- валидные `ESIMACCESS_*` переменные в локальном окружении или staging;
- тестовый заказ с ICCID;
- Telegram bot token для проверки уведомлений, если тестируется bot delivery.

## Архитектурные решения

- Provider response должен маппиться в внутренние статусы явно, без UI-догадок.
- Usage polling/cache не должен ломать UI при временной ошибке provider.
- Activation data хранится как provider artifact и отображается разными клиентами из одного backend contract.

## Шаги (журналы)

- [Шаг 1. Снять реальный provider contract](./phase-5/step-1-provider-contract.md)
- [Шаг 2. Исправить status/usage mapping](./phase-5/step-2-status-usage-mapping.md)
- [Шаг 3. Довести client `my-esim` отображение](./phase-5/step-3-client-my-esim.md)
- [Шаг 4. Довести bot activation/status flow](./phase-5/step-4-bot-activation-status-flow.md)
- [Шаг 5. Проверить low-traffic notifications](./phase-5/step-5-low-traffic-notifications.md)

## Верификация

- Реальный eSIM order возвращает usage/status без backend ошибок.
- Client показывает расход трафика и статус, соответствующие provider dashboard/response.
- Bot показывает activation данные без ручного поиска QR в админке.
- Low-traffic notification доставляется в Telegram на контролируемом сценарии.


## Журнал

- 


## Ссылки на ранее созданные фазы и шаги, которые нужно учитывать при разработке этой фазы и ссылка назад на главный файл фазы из каждого шага.

- [Корневой документ wiki](../README.md)
