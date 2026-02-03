import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);
  private readonly botToken: string;
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN') || '';
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    
    if (this.botToken) {
      this.logger.log('✅ Telegram Notification Service initialized');
    } else {
      this.logger.warn('⚠️ TELEGRAM_BOT_TOKEN not set - notifications disabled');
    }
  }

  /**
   * Отправить уведомление об успешной оплате
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
            web_app: { url: 'https://esim-anton-production.up.railway.app/my-esim' }
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
            url: 'https://t.me/esim_testt_bot/app'
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
