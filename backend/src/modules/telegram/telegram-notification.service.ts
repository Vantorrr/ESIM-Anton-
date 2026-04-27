import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);
  private readonly botToken: string;
  private readonly apiUrl: string;

  private readonly botUsername: string;
  private readonly miniAppUrl: string;
  private readonly siteUrl: string;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN') || '';
    this.botUsername = this.configService.get('TELEGRAM_BOT_USERNAME') || 'mojo_mobile_bot';
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.miniAppUrl = this.configService.get('MINI_APP_URL') || 'https://mojomobile.ru/my-esim';
    this.siteUrl = this.configService.get('SITE_URL') || 'https://mojomobile.ru';
    
    if (this.botToken) {
      this.logger.log('✅ Telegram Notification Service initialized');
    } else {
      this.logger.warn('⚠️ TELEGRAM_BOT_TOKEN not set - notifications disabled');
    }
  }

  /**
   * Отправить уведомление об успешной оплате (без деталей eSIM)
   */
  async sendPaymentSuccessNotification(
    telegramId: bigint | number | string,
    orderDetails: {
      orderId: string;
      productName: string;
      country: string;
      dataAmount: string;
      price: number;
    }
  ) {
    if (!this.botToken) {
      this.logger.warn('Cannot send notification - bot token not set');
      return;
    }

    const message = `
✅ <b>Оплата прошла успешно!</b>

📦 <b>Ваш заказ готов</b>
🌍 Страна: ${orderDetails.country}
📶 Трафик: ${orderDetails.dataAmount}
💰 Сумма: ${orderDetails.price} ₽

Ваш eSIM готов к активации! Нажмите кнопку ниже, чтобы получить QR-код для установки.
    `.trim();

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '📱 Открыть Мои eSIM',
            web_app: { url: this.miniAppUrl }
          }
        ]
      ]
    };

    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: telegramId.toString(),
        text: message,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      this.logger.log(`✅ Notification sent to ${telegramId}, message_id: ${response.data.result?.message_id}`);
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Failed to send notification to ${telegramId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Отправить произвольное текстовое уведомление в Telegram пользователю.
   * Используется, например, мониторингом трафика для предупреждения о низком остатке.
   */
  async sendTextNotification(
    telegramId: bigint | number | string,
    text: string,
    options?: { parseMode?: 'HTML' | 'Markdown'; openMyEsim?: boolean },
  ) {
    if (!this.botToken) {
      this.logger.warn('Cannot send notification - bot token not set');
      return;
    }

    const replyMarkup = options?.openMyEsim
      ? {
          inline_keyboard: [
            [
              {
                text: '📱 Открыть Мои eSIM',
                web_app: { url: this.miniAppUrl },
              },
            ],
          ],
        }
      : undefined;

    try {
      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: telegramId.toString(),
        text,
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: replyMarkup,
      });
    } catch (error: any) {
      this.logger.error(
        `❌ sendTextNotification failed for ${telegramId}: ${error.message}`,
      );
    }
  }

  /**
   * Отправить eSIM с QR-кодом, ICCID и кодом активации в бот
   */
  async sendEsimDetails(
    telegramId: bigint | number | string,
    details: {
      country: string;
      dataAmount: string;
      iccid?: string;
      qrCode?: string;
      activationCode?: string;
    }
  ) {
    if (!this.botToken) return;

    const lines = [
      `🎉 <b>Ваша eSIM готова к установке!</b>`,
      ``,
      `🌍 <b>Страна:</b> ${details.country}`,
      `📶 <b>Трафик:</b> ${details.dataAmount}`,
    ];
    if (details.iccid) lines.push(`🔢 <b>ICCID:</b> <code>${details.iccid}</code>`);
    if (details.activationCode) {
      lines.push(``, `📋 <b>Код активации (LPA):</b>`);
      lines.push(`<code>${details.activationCode}</code>`);
    }
    lines.push(``, `📲 <i>Отсканируйте QR-код ниже в настройках телефона → Мобильные данные → Добавить тариф</i>`);

    const keyboard = {
      inline_keyboard: [[{
        text: '📱 Открыть Мои eSIM',
        web_app: { url: this.miniAppUrl },
      }]]
    };

    const chatId = telegramId.toString();

    try {
      if (details.qrCode) {
        await axios.post(`${this.apiUrl}/sendPhoto`, {
          chat_id: chatId,
          photo: details.qrCode,
          caption: lines.join('\n'),
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
        this.logger.log(`✅ eSIM details + QR sent to ${chatId}`);
      } else {
        await axios.post(`${this.apiUrl}/sendMessage`, {
          chat_id: chatId,
          text: lines.join('\n'),
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
        this.logger.log(`✅ eSIM details sent to ${chatId}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to send eSIM details to ${chatId}: ${error.message}`);
    }
  }

  /**
   * Отправить уведомление об ошибке оплаты
   */
  async sendPaymentFailedNotification(
    telegramId: bigint | number | string,
    reason?: string
  ) {
    if (!this.botToken) {
      return;
    }

    const message = `
❌ <b>Оплата не прошла</b>

${reason ? `Причина: ${reason}` : 'Попробуйте еще раз или выберите другой способ оплаты.'}
    `.trim();

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🔄 Попробовать снова',
            web_app: { url: this.siteUrl }
          }
        ]
      ]
    };

    try {
      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: telegramId.toString(),
        text: message,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

      this.logger.log(`✅ Failure notification sent to ${telegramId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send failure notification: ${error.message}`);
    }
  }
}
