# Local User Auth Switching

> [Корневой документ wiki](../README.md)

Runbook для локального входа под уже существующим пользователем после клонирования production-like базы.

## Зачем нужен этот документ

В проекте нет user-password auth. Пользовательский вход сделан через:

- phone OTP
- OAuth
- Telegram

Это значит, что "зайти под пользователем" локально обычно означает:

1. выбрать существующего пользователя в таблице `users`;
2. привязать к нему удобный локальный login method;
3. войти через обычный frontend flow.

Source of truth по логике:

- [backend/src/modules/auth/auth.service.ts](../../backend/src/modules/auth/auth.service.ts)
- [backend/src/modules/auth/sms.service.ts](../../backend/src/modules/auth/sms.service.ts)
- [backend/prisma/schema.prisma](../../backend/prisma/schema.prisma)

## Важная модель авторизации

### Phone login

`AuthService.loginWithPhone()` ищет пользователя только по `phone`.

Если пользователя с таким номером нет, backend создаст нового.

Следствие:

- для входа под существующим пользователем нужно сначала записать ему `phone`;
- при желании можно также обновить `authProvider` и `providerId`, но критичен именно `phone`.

### OAuth / Telegram

`loginWithOAuth()` матчится по одному из источников:

- `authProvider + providerId`
- `telegramId` для Telegram
- `email` для Google/Yandex

Следствие:

- для принудительного локального входа phone flow обычно проще и безопаснее;
- менять Telegram/OAuth идентификаторы стоит только если вы понимаете, какие связи хотите сохранить.

## Предпосылки

- локальная БД уже импортирована из Railway или подготовлена другим способом;
- локальный PostgreSQL живёт в Docker-контейнере `esim-postgres`;
- DB credentials по `docker-compose.yml`:
  - DB: `esim_db`
  - User: `postgres`
  - Password: `postgres`

## Сценарий 1. Войти под существующим пользователем через телефон

### Шаг 1. Найти пользователя

Примеры:

```bash
docker exec -e PGPASSWORD=postgres -i esim-postgres \
  psql -U postgres -d esim_db \
  -c "select id, \"firstName\", \"lastName\", username, \"authProvider\", phone from users where username = 'Dmitry_ManWorld';"
```

```bash
docker exec -e PGPASSWORD=postgres -i esim-postgres \
  psql -U postgres -d esim_db \
  -c "select id, \"firstName\", \"lastName\", username, \"authProvider\", phone from users where \"firstName\" ilike '%Дмитрий%' or \"lastName\" ilike '%Свистунов%';"
```

### Шаг 2. Привязать тестовый номер

Пример номера: `+79991112232`

```bash
docker exec -e PGPASSWORD=postgres -i esim-postgres \
  psql -U postgres -d esim_db \
  -c "update users set phone = '+79991112232', \"providerId\" = '+79991112232' where id = 'USER_ID_HERE';"
```

Если хотите сделать phone provider явным:

```bash
docker exec -e PGPASSWORD=postgres -i esim-postgres \
  psql -U postgres -d esim_db \
  -c "update users set phone = '+79991112232', \"authProvider\" = 'phone', \"providerId\" = '+79991112232' where id = 'USER_ID_HERE';"
```

### Шаг 3. Удалить случайно созданного phone-user, если уже успели войти не в ту запись

```bash
docker exec -e PGPASSWORD=postgres -i esim-postgres \
  psql -U postgres -d esim_db \
  -c "delete from users where phone = '+79991112232' and \"authProvider\" = 'phone';"
```

Делайте это только если уверены, что удаляете новый тестовый аккаунт, а не нужного пользователя.

### Шаг 4. Запросить OTP-код через клиент

Обычный flow:

1. открыть `http://localhost:3002/login`;
2. ввести тестовый номер;
3. запросить код.

### Шаг 5. Прочитать код из таблицы `sms_codes`

```bash
docker exec -e PGPASSWORD=postgres -i esim-postgres \
  psql -U postgres -d esim_db \
  -c "select phone, code, \"expiresAt\" from sms_codes order by \"createdAt\" desc limit 5;"
```

Если локальный SMS provider не настроен, backend всё равно создаёт запись в `sms_codes`, и этого достаточно для входа.

## Сценарий 2. Переключить пользователя обратно на Telegram

Если хотите вернуть ему telegram-first логин после тестов:

```bash
docker exec -e PGPASSWORD=postgres -i esim-postgres \
  psql -U postgres -d esim_db \
  -c "update users set \"authProvider\" = 'telegram' where id = 'USER_ID_HERE';"
```

Телефон при этом можно оставить или убрать отдельно:

```bash
docker exec -e PGPASSWORD=postgres -i esim-postgres \
  psql -U postgres -d esim_db \
  -c "update users set phone = null where id = 'USER_ID_HERE';"
```

## Сценарий 3. Переключить пользователя на email/OAuth идентификатор

Это уже рискованнее, потому что можно задеть реальные provider bindings.

Пример:

```bash
docker exec -e PGPASSWORD=postgres -i esim-postgres \
  psql -U postgres -d esim_db \
  -c "update users set email = 'local-test@example.com', \"authProvider\" = 'google', \"providerId\" = 'local-google-test' where id = 'USER_ID_HERE';"
```

Использовать только если тест реально требует OAuth-пути.

## Проверка результата

```bash
docker exec -e PGPASSWORD=postgres -i esim-postgres \
  psql -U postgres -d esim_db \
  -c "select id, phone, email, username, \"firstName\", \"lastName\", \"authProvider\", \"providerId\", \"telegramId\" from users where id = 'USER_ID_HERE';"
```

## Чего не делать

- не искать user password: его нет в схеме;
- не менять `id` пользователя;
- не запускать `seed` после импорта production-like базы;
- не менять provider binding вслепую на реальном production.
