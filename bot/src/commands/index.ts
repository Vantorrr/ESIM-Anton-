import { Bot } from 'grammy';
import { InlineKeyboard } from 'grammy';

export function setupCommands(bot: Bot) {
  // /start
  bot.command('start', async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text('🌍 Каталог eSIM', 'catalog')
      .text('👤 Мой профиль', 'profile')
      .row()
      .text('📦 Мои заказы', 'orders')
      .text('🎁 Рефералы', 'referrals')
      .row()
      .text('❓ Помощь', 'help');

    await ctx.reply(
      `👋 Привет, ${ctx.from?.first_name}!\n\n` +
      `Добро пожаловать в **eSIM Сервис** — твой надежный партнер для мобильного интернета по всему миру! 🌐\n\n` +
      `🔥 **Что мы предлагаем:**\n` +
      `• Более 100 стран\n` +
      `• Моментальная активация\n` +
      `• Выгодные цены\n` +
      `• Круглосуточная поддержка\n\n` +
      `Выбери действие:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  // Обработка кнопок
  bot.callbackQuery('catalog', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const keyboard = new InlineKeyboard()
      .text('🇺🇸 США', 'country_usa')
      .text('🇪🇺 Европа', 'country_europe')
      .row()
      .text('🇹🇷 Турция', 'country_turkey')
      .text('🇦🇪 ОАЭ', 'country_uae')
      .row()
      .text('🇹🇭 Азия', 'country_asia')
      .text('🌍 Все страны', 'all_countries')
      .row()
      .text('« Назад', 'back_to_menu');

    await ctx.editMessageText(
      '🌍 **Каталог eSIM**\n\nВыберите страну или регион:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  bot.callbackQuery('profile', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    // TODO: Получить данные пользователя из API
    const keyboard = new InlineKeyboard()
      .text('« Назад', 'back_to_menu');

    await ctx.editMessageText(
      `👤 **Мой профиль**\n\n` +
      `ID: #${ctx.from?.id}\n` +
      `Имя: ${ctx.from?.first_name}\n` +
      `Баланс бонусов: ₽0\n` +
      `Уровень: Новичок\n\n` +
      `📊 Статистика:\n` +
      `• Заказов: 0\n` +
      `• Потрачено: ₽0\n` +
      `• Рефералов: 0`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  bot.callbackQuery('orders', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const keyboard = new InlineKeyboard()
      .text('« Назад', 'back_to_menu');

    await ctx.editMessageText(
      `📦 **Мои заказы**\n\n` +
      `У вас пока нет заказов.\n\n` +
      `Перейдите в каталог, чтобы выбрать eSIM!`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  bot.callbackQuery('referrals', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const referralLink = `https://t.me/${ctx.me.username}?start=ref_${ctx.from?.id}`;
    
    const keyboard = new InlineKeyboard()
      .url('📤 Поделиться', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}`)
      .row()
      .text('« Назад', 'back_to_menu');

    await ctx.editMessageText(
      `🎁 **Реферальная программа**\n\n` +
      `Приглашай друзей и получай **5%** с каждой их покупки!\n\n` +
      `Твоя реферальная ссылка:\n` +
      `\`${referralLink}\`\n\n` +
      `📊 Статистика:\n` +
      `• Рефералов: 0\n` +
      `• Заработано: ₽0`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  bot.callbackQuery('help', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const keyboard = new InlineKeyboard()
      .url('💬 Поддержка', 'https://t.me/support')
      .row()
      .text('« Назад', 'back_to_menu');

    await ctx.editMessageText(
      `❓ **Помощь**\n\n` +
      `**Как купить eSIM?**\n` +
      `1. Выберите страну в каталоге\n` +
      `2. Выберите подходящий тариф\n` +
      `3. Оплатите заказ\n` +
      `4. Получите QR-код для активации\n\n` +
      `**Как активировать eSIM?**\n` +
      `1. Откройте настройки → Сотовая связь\n` +
      `2. Добавить eSIM\n` +
      `3. Сканируйте QR-код\n\n` +
      `Если возникли вопросы — обращайтесь в поддержку!`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  bot.callbackQuery('back_to_menu', async (ctx) => {
    await ctx.answerCallbackQuery();
    
    const keyboard = new InlineKeyboard()
      .text('🌍 Каталог eSIM', 'catalog')
      .text('👤 Мой профиль', 'profile')
      .row()
      .text('📦 Мои заказы', 'orders')
      .text('🎁 Рефералы', 'referrals')
      .row()
      .text('❓ Помощь', 'help');

    await ctx.editMessageText(
      `Добро пожаловать в **eSIM Сервис** — твой надежный партнер для мобильного интернета по всему миру! 🌐\n\n` +
      `Выбери действие:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  // Обработка выбора страны (заглушка)
  bot.callbackQuery(/^country_/, async (ctx) => {
    await ctx.answerCallbackQuery('Загрузка тарифов...');
    
    const keyboard = new InlineKeyboard()
      .text('« Назад', 'catalog');

    await ctx.editMessageText(
      `📦 **Доступные тарифы**\n\n` +
      `После интеграции с API провайдера здесь будет список тарифов.\n\n` +
      `Пока что это демо-версия.`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  });

  // /help
  bot.command('help', async (ctx) => {
    await ctx.reply(
      `❓ **Помощь**\n\n` +
      `Доступные команды:\n` +
      `/start - Главное меню\n` +
      `/help - Помощь\n` +
      `/catalog - Каталог eSIM\n` +
      `/profile - Мой профиль\n` +
      `/orders - Мои заказы`,
      { parse_mode: 'Markdown' }
    );
  });
}
