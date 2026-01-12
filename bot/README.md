# Telegram Bot + Mini App

## Структура

```
src/
├── index.ts          → Главный файл
├── config.ts         → Конфигурация
├── api.ts            → API клиент для Backend
├── commands/         → Команды бота
│   └── index.ts
└── scenes/           → Сценарии (диалоги)
    └── index.ts
```

## Запуск

```bash
# Установить зависимости
pnpm install

# Запустить в dev режиме
pnpm dev

# Production
pnpm build
pnpm start
```

## Создание бота

1. Напишите @BotFather в Telegram
2. Выполните `/newbot`
3. Следуйте инструкциям
4. Скопируйте токен
5. Добавьте токен в `.env`:
   ```
   TELEGRAM_BOT_TOKEN="your_token_here"
   ```

## Mini App (будет реализовано)

Mini App будет создан на React и размещен отдельно.
Бот будет открывать Mini App через inline кнопку.
