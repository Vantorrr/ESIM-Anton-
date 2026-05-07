# Шаг 2. Исправить status/usage mapping

> [⬅️ Назад к фазе](../phase-5-esim-usage-status-and-activation.md)

## Цель

Сделать backend contract стабильным для UI.

## Что нужно сделать

- проверить `/orders/:id/usage`;
- проверить кэширование usage/status;
- нормализовать статусы и fallback-состояния;
- не показывать пользователю stale/empty usage как валидный ноль, если provider не ответил.

## Результат шага

UI получает корректный usage/status contract.

## Статус

Частично выполнено

## Журнал изменений

- backend usage/status flow скорректирован под реальный eSIM Access contract: `EsimAccessProvider.getEsimInfo()` теперь предпочитает `POST /esim/list` по ICCID и падает обратно на `POST /esim/query`, если list-path недоступен;
- нормализация статусов расширена под коды `Provisioning`, `Available`, `Downloaded`, `Onboard`, `In Use`, `Suspended`, `UsedUp`, `Disabled` и другие вариации форматирования (`IN USE`, `USEDUP`, дефисы/пробелы);
- `OrdersService.getOrderUsage()` теперь строит contract для UI от остатка, а не только от факта `usedBytes`: если провайдер прислал `remainingBytes` или новая eSIM ещё не тратила трафик, карточка всё равно получает валидный progress/status snapshot вместо ложного `provider unavailable`.
- после code review исправлен баг кэша: вычисленный `usedBytes=total-remaining` теперь тоже сохраняется в `Order.lastUsageBytes`, иначе следующий запрос мог снова деградировать в `available=false`;
- fallback по `smdpStatus` сделан более консервативным: `ENABLED` больше не превращается в ложный `ACTIVE`, а `INSTALLATION/INSTALLED` не заявляют пользователю, что data plan уже активен.

## Файлы

- `backend/src/modules/esim-provider/providers/esimaccess.provider.ts`
- `backend/src/modules/esim-provider/esim-provider.service.ts`
- `backend/src/modules/esim-provider/esim-status.ts`
- `backend/src/modules/orders/orders.service.ts`

## Тестирование / Верификация

- `npx tsc --noEmit -p backend/tsconfig.json`
- `npx jest --runInBand src/modules/esim-provider/esim-status.spec.ts`
- `npx jest --runInBand src/modules/orders/orders.service.spec.ts`
- Полный runtime с реальным ICCID и provider credentials всё ещё требуется отдельно.
