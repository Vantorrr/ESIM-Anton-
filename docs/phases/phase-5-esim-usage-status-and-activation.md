# Phase 5: eSIM Usage, Status & Activation

> [Корневой документ wiki](../README.md)

## Цель

Довести пользовательский eSIM lifecycle: корректный статус, расход трафика, срок действия и activation links.

## Результат

- usage/status проверены на реальном eSIM Access заказе;
- client/bot показывают понятный статус eSIM;
- доступны QR, LPA/iOS/Android activation instructions или ссылки;
- backend cache-поля `lastUsage*`, `esimStatus`, `activatedAt`, `expiresAt`, `smdpAddress` подтверждены на реальном provider response;
- low-traffic notification подтверждён на реальных или контролируемых provider данных.

## Оценка

Высокий продуктовый приоритет, но зависит от внешних credentials и реального provider response.

## Зависит от

- [phase-2-runtime-verification.md](./phase-2-runtime-verification.md)
- [../integrations/esim-access.md](../integrations/esim-access.md)

## Пререквизиты

- валидные `ESIMACCESS_*` переменные в локальном окружении или staging;
- тестовый заказ с ICCID;
- Telegram bot token для проверки уведомлений, если тестируется bot delivery;
- доступен способ воспроизвести controlled scenario для low-traffic проверки, если реального почти-исчерпанного пакета нет.

## Архитектурные решения

- Provider response должен маппиться в внутренние статусы явно, без UI-догадок.
- Usage polling/cache не должен ломать UI при временной ошибке provider.
- Activation data хранится как provider artifact и отображается разными клиентами из одного backend contract.
- Phase 5 должна проверять не только `OrdersService.getOrderUsage()`, но и `purchaseEsim()` contract, потому что QR/LPA/ICCID приходят уже на момент `fulfillOrder()`.
- Если реальный provider не отдаёт usage сразу после покупки, это не баг само по себе: нужно отдельно различать `status available` и `traffic available`.

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

- **[2026-05-07] Аудит текущего состояния:**
  - Backend уже содержит развитый usage/status lifecycle: `EsimProviderService.getEsimSnapshot()` нормализует provider status, usage, activation code, SMDP и даты; `OrdersService.getOrderUsage()` кэширует snapshot в `Order`.
  - Client `/my-esim` уже отображает status, traffic progress, validity progress и activation instructions на основе этого backend contract.
  - Telegram notification слой уже умеет отправлять QR, ICCID, LPA и iPhone install link после `fulfillOrder()`.
  - Нереализованной остаётся не базовая структура, а подтверждение реального provider contract, проверка граничных статусов и controlled verification для low-traffic monitor.
  - Фаза должна явно проверить различия между первоначальным `purchaseEsim()` response и последующим `getEsimInfo()` snapshot, чтобы не потерять activation/status поля на раннем этапе lifecycle.


## Ссылки на ранее созданные фазы и шаги, которые нужно учитывать при разработке этой фазы и ссылка назад на главный файл фазы из каждого шага.

- [Корневой документ wiki](../README.md)
