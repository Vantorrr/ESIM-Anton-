# eSIM Service - Программный комплекс для продажи eSIM

<img alt="Status" src="https://img.shields.io/badge/status-in_development-yellow">

## 🚀 Архитектура

Проект построен по принципу **API-First (Headless)** с микросервисной архитектурой:

```
┌─────────────────┐
│  Telegram Bot   │ ────┐
│   + Mini App    │     │
└─────────────────┘     │
                        ▼
┌─────────────────┐   ┌──────────────┐   ┌─────────────┐
│  Admin Panel    │──▶│   Backend    │──▶│ PostgreSQL  │
│   (Next.js)     │   │  (NestJS)    │   │   + Redis   │
└─────────────────┘   └──────────────┘   └─────────────┘
                        │
                        ▼
                ┌───────────────────┐
                │   Интеграции:     │
                │  - eSIM Provider  │
                │  - ЮKassa         │
                └───────────────────┘
```

## 📦 Стек технологий

### Backend
- **Node.js 20+ / NestJS** - Серверная логика
- **PostgreSQL** - Основная БД
- **Redis** - Кэш + очереди
- **Prisma ORM** - Работа с БД
- **TypeScript** - Типобезопасность

### Admin Panel
- **Next.js 15 (App Router)** - React фреймворк
- **TailwindCSS + Shadcn/ui** - Дизайн-система (Liquid Glass)
- **TypeScript** - Типобезопасность

### Telegram Bot
- **Grammy** - Современный фреймворк для ботов
- **React** - Mini App интерфейс

## 🛠 Установка и запуск

### Требования
- Node.js 20+
- Docker & Docker Compose
- pnpm (или npm/yarn)

### Быстрый старт

```bash
# 1. Клонировать репозиторий
cd Antonio

# 2. Установить зависимости
pnpm install

# 3. Запустить БД через Docker
docker-compose up -d

# 4. Настроить переменные окружения
cp .env.example .env
# Отредактировать .env (добавить токены, API ключи)

# 5. Применить миграции БД
cd backend
pnpm prisma migrate dev

# 6. Запустить в dev режиме
pnpm dev
```

После запуска:
- **Backend API**: http://localhost:3000
- **Admin Panel**: http://localhost:3001
- **Telegram Bot**: Работает через webhook/polling

## 📂 Структура проекта

```
/backend          → NestJS API (порт 3000)
  /src
    /modules      → Бизнес-модули
      /users      → Пользователи
      /orders     → Заказы
      /esim       → eSIM интеграция
      /payments   → Платежи (ЮKassa)
      /referrals  → Реферальная система
      /loyalty    → Программа лояльности
      /analytics  → Аналитика
    /common       → Общие утилиты
    /config       → Конфигурация
  /prisma         → Схема БД + миграции

/admin            → Next.js админка (порт 3001)
  /app            → App Router страницы
  /components     → React компоненты
  /lib            → Утилиты

/bot              → Telegram Bot
  /handlers       → Обработчики команд
  /scenes         → Сценарии (каталог, покупка)
  /mini-app       → Mini App (React)

/shared           → Общие типы/константы
/docs             → Документация API
```

## 🔐 Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/esim_db"
REDIS_URL="redis://localhost:6379"

# Telegram
TELEGRAM_BOT_TOKEN="your_bot_token"
TELEGRAM_WEBHOOK_URL="https://yourdomain.com/webhook"

# Payments
YUKASSA_SHOP_ID="your_shop_id"
YUKASSA_SECRET_KEY="your_secret_key"

# eSIM Provider
ESIM_PROVIDER_API_URL="https://api.provider.com"
ESIM_PROVIDER_API_KEY="your_api_key"

# JWT
JWT_SECRET="your_jwt_secret"
JWT_EXPIRES_IN="7d"

# Admin
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="secure_password"
```

## 📊 База данных

Схема БД включает:
- `users` - Пользователи (Telegram ID, баланс, реферальный код)
- `orders` - Заказы
- `esim_products` - Каталог тарифов
- `transactions` - Платежи
- `referrals` - Реферальные связи
- `loyalty_levels` - Уровни лояльности

## 🎨 Дизайн (Liquid Glass)

Admin панель выполнена в стиле **iOS Glassmorphism**:
- Полупрозрачные карточки с blur-эффектом
- Мягкие тени и градиенты
- Пастельная палитра без резких контрастов
- Плавные анимации

## 🧪 Тестирование

```bash
# Unit тесты
pnpm test

# E2E тесты
pnpm test:e2e

# Покрытие
pnpm test:cov
```

## 📝 API Документация

После запуска backend доступна Swagger документация:
```
http://localhost:3000/api/docs
```

## 🚢 Деплой

```bash
# Production сборка
pnpm build

# Запуск production
pnpm start
```

## 📄 Лицензия

Proprietary - Все права защищены (Договор №TMA345)

---

**Разработано с ❤️ на современном стеке**
