# 🚀 Деплой на production

## Варианты хостинга

### Вариант 1: VPS (рекомендуется)

**Подходит:** DigitalOcean, Hetzner, Contabo, Selectel

**Требования:**
- Ubuntu 22.04 LTS
- 2GB RAM (минимум), 4GB+ (рекомендуется)
- 20GB SSD

**Стоимость:** ~5-10$/месяц

---

## Инструкция по деплою на VPS

### 1. Подключение к серверу

```bash
ssh root@your_server_ip
```

### 2. Установка зависимостей

```bash
# Обновить систему
apt update && apt upgrade -y

# Установить Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установить pnpm
npm install -g pnpm

# Установить Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# Установить Docker Compose
apt install -y docker-compose

# Установить Git
apt install -y git

# Установить Nginx
apt install -y nginx
```

### 3. Клонирование проекта

```bash
cd /var/www
git clone <ваш_репозиторий> esim-service
cd esim-service
```

### 4. Настройка переменных окружения

```bash
cp .env.example .env
nano .env
```

Измените на production значения:
```env
NODE_ENV="production"
DATABASE_URL="postgresql://esim_user:STRONG_PASSWORD@localhost:5432/esim_db"
JWT_SECRET="<сгенерируйте: openssl rand -hex 32>"
TELEGRAM_BOT_TOKEN="<ваш_токен>"
YUKASSA_SHOP_ID="<ваш_shop_id>"
YUKASSA_SECRET_KEY="<ваш_secret>"
NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
CORS_ORIGIN="https://admin.yourdomain.com"
TELEGRAM_USE_WEBHOOK=true
TELEGRAM_WEBHOOK_URL="https://api.yourdomain.com/webhook"
```

Сохраните: `Ctrl+X` → `Y` → `Enter`

### 5. Установка и сборка

```bash
# Установить зависимости
pnpm install

# Запустить БД
docker-compose up -d

# Применить миграции
cd backend
pnpm prisma migrate deploy
pnpm prisma:seed

# Собрать проект
cd ..
pnpm build
```

### 6. Настройка PM2 (Process Manager)

```bash
# Установить PM2
npm install -g pm2

# Создать ecosystem файл
nano ecosystem.config.js
```

Вставьте:
```javascript
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'admin',
      cwd: './admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'bot',
      cwd: './bot',
      script: 'dist/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

Запустите:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Настройка Nginx

```bash
nano /etc/nginx/sites-available/esim-service
```

Вставьте:
```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Admin Panel
server {
    listen 80;
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активируйте:
```bash
ln -s /etc/nginx/sites-available/esim-service /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 8. Установка SSL (Let's Encrypt)

```bash
# Установить Certbot
apt install -y certbot python3-certbot-nginx

# Получить сертификаты
certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com

# Автообновление (проверка)
certbot renew --dry-run
```

### 9. Настройка Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.yourdomain.com/webhook"}'
```

### 10. Настройка Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## Мониторинг и логи

```bash
# Посмотреть статус
pm2 status

# Логи
pm2 logs

# Логи конкретного процесса
pm2 logs backend
pm2 logs bot

# Мониторинг
pm2 monit

# Перезапуск
pm2 restart all
pm2 restart backend
```

---

## Backup

### Автоматический backup БД

```bash
nano /root/backup-db.sh
```

Вставьте:
```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

mkdir -p $BACKUP_DIR

docker exec esim-postgres pg_dump -U esim_user esim_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Удалить старые (>7 дней)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
```

Сделайте исполняемым:
```bash
chmod +x /root/backup-db.sh
```

Добавьте в cron (каждый день в 3:00):
```bash
crontab -e
```

Добавьте строку:
```
0 3 * * * /root/backup-db.sh
```

---

## Обновление проекта

```bash
cd /var/www/esim-service

# Остановить процессы
pm2 stop all

# Обновить код
git pull

# Установить зависимости
pnpm install

# Применить миграции
cd backend
pnpm prisma migrate deploy
cd ..

# Пересобрать
pnpm build

# Запустить
pm2 restart all
```

---

## Альтернатива: Heroku / Railway / Render

Эти платформы проще, но дороже при масштабировании.

**Railway.app** (рекомендуется для быстрого старта):
1. Подключите GitHub репозиторий
2. Добавьте PostgreSQL сервис
3. Настройте переменные окружения
4. Deploy автоматический

---

## Чеклист перед production

- [ ] Изменены все пароли и секреты
- [ ] Настроен SSL
- [ ] Настроен Firewall
- [ ] Настроен backup БД
- [ ] Добавлен мониторинг (PM2, UptimeRobot)
- [ ] Настроены Webhooks (Telegram, ЮKassa)
- [ ] Протестированы все основные сценарии
- [ ] Настроены логи ошибок

---

**Готово! Ваш сервис в production 🚀**
