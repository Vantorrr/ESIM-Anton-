import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { config } from './config';
import { setupCommands } from './commands';
import { setupScenes } from './scenes';
import { api } from './api';
import { MyContext } from './types';

console.log(`
╔═══════════════════════════════════════╗
║   eSIM Telegram Bot                   ║
║   Запуск...                           ║
╚═══════════════════════════════════════╝
`);

// Создаем бота
const bot = new Bot<MyContext>(config.botToken);

// Middleware
bot.use(session({
  initial: (): any => ({
    userId: null,
    currentScene: null,
  }),
}));

bot.use(conversations());

// Регистрируем пользователя при первом контакте
bot.use(async (ctx, next) => {
  if (ctx.from) {
    try {
      // Создаем или находим пользователя
      const user = await api.users.findOrCreate(
        BigInt(ctx.from.id),
        {
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
        }
      );
      
      ctx.session.userId = user.id;
    } catch (error) {
      console.error('Ошибка регистрации пользователя:', error);
    }
  }
  await next();
});

// Команды и сценарии
setupCommands(bot);
setupScenes(bot);

// Запуск бота
bot.start({
  onStart: () => {
    console.log(`
✅ Бот успешно запущен!
🤖 Username: @${bot.botInfo.username}
🔗 Link: https://t.me/${bot.botInfo.username}
    `);
  },
});

// Обработка ошибок
bot.catch((err) => {
  console.error('❌ Ошибка бота:', err);
});

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n⏳ Остановка бота...');
  bot.stop();
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('\n⏳ Остановка бота...');
  bot.stop();
  process.exit(0);
});
