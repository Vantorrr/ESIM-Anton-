import dotenv from 'dotenv';
import path from 'path';

// Загружаем .env из корня проекта
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  // API_BASE_URL - без /api, API_URL - может быть с /api
  apiUrl: process.env.API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3000',
  useWebhook: process.env.TELEGRAM_USE_WEBHOOK === 'true',
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
};

// Проверка обязательных переменных
if (!config.botToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN не установлен!');
  console.log('💡 Создайте бота через @BotFather и добавьте токен в .env файл');
  process.exit(1);
}
