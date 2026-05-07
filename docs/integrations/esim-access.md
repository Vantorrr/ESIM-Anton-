# eSIM Access Integration

> [Корневой документ wiki](../README.md)

## Статус

Интеграция с eSIM Access присутствует в коде и является фактическим primary provider path в `backend/src/modules/esim-provider/esim-provider.service.ts`.

Актуальная архитектурная сводка:

- [../architecture/system-overview.md](../architecture/system-overview.md)
- [../architecture/runtime-and-operations.md](../architecture/runtime-and-operations.md)
- [../architecture/legacy-doc-audit.md](../architecture/legacy-doc-audit.md)

## Что важно

- этот файл больше не хранит реальные credentials;
- любые access codes, secret keys, логины и пароли должны жить только в локальном `.env` или в secrets manager;
- попадание реальных доступов в git нужно считать security incident.

## Переменные окружения

Используются следующие env keys:

```env
ESIMACCESS_ACCESS_CODE=
ESIMACCESS_SECRET_KEY=
```

Legacy compatibility keys, которые тоже читаются сервисом:

```env
ESIM_PRIMARY_API_URL=https://api.esimgo.com/v2
ESIM_PRIMARY_API_KEY=
ESIM_FALLBACK_API_URL=
ESIM_FALLBACK_API_KEY=
```

## Подтвержденные возможности по коду

- получение списка пакетов;
- покупка eSIM;
- получение информации по заказу;
- получение usage/status snapshot по ICCID;
- top-up пакетов и пополнение eSIM;
- health check.

## Usage/status contract

- для usage/status по ICCID код теперь сначала использует `POST /api/v1/open/esim/list` (`Query All Allocated Profiles`) с `iccid + pager`, потому что именно этот endpoint у eSIM Access возвращает `esimList[]` c `totalVolume`, usage/status и сроком;
- если `/esim/list` вернул пусто или ошибку, включается fallback на `POST /api/v1/open/esim/query`, чтобы не ломать старые заказы/вариации API;
- нормализация статусов расширена под реальные коды eSIM Access: `Provisioning`, `New`, `Available`, `Downloaded`, `Onboard`, `In Use`, `Suspended`, `UsedUp`, `Disabled` и legacy-коды вроде `GOT_RESOURCE`, `RELEASED`, `INSTALLATION`.

## Ограничения

- `syncProducts()` в текущем сервисе не пишет данные в БД, а только получает пакеты и возвращает счётчик;
- coexistence с legacy eSIM Go кодом всё ещё создаёт двусмысленность в операционной модели;
- без валидных credentials provider endpoints будут недоступны.

## Следующий шаг

Отдельной задачей нужно:

1. проверить реальный provider flow в runtime;
2. решить, что остаётся как fallback, а что можно удалить;
3. задокументировать production-safe процесс ротации secrets.
