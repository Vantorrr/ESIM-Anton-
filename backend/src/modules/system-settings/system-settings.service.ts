import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class SystemSettingsService implements OnModuleInit {
  private readonly logger = new Logger(SystemSettingsService.name);
  
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    // Проверяем настройку автообновления курса при старте
    const autoUpdate = await this.getByKey('auto_update_exchange_rate');
    if (autoUpdate?.value === 'true') {
      this.logger.log('🔄 Автообновление курса включено (ежедневно в 9:00)');
    }
  }

  /**
   * Автоматическое обновление курса каждый день в 9:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleExchangeRateUpdate() {
    try {
      // Проверяем включено ли автообновление
      const autoUpdate = await this.getByKey('auto_update_exchange_rate');
      if (autoUpdate?.value !== 'true') {
        return; // Автообновление выключено
      }

      this.logger.log('🔄 Автоматическое обновление курса USD/RUB...');
      const result = await this.updateExchangeRateFromCBR();
      this.logger.log(`✅ Курс обновлён: ${result.rate}₽/$ (дата ЦБ: ${result.date})`);
    } catch (error) {
      this.logger.error('❌ Ошибка автообновления курса:', error.message);
    }
  }

  /**
   * Получить все настройки
   */
  async getAll() {
    const settings = await this.prisma.systemSettings.findMany();
    
    // Преобразуем в объект для удобства
    const settingsObj: Record<string, any> = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = {
        value: setting.value,
        description: setting.description,
      };
    });
    
    return settingsObj;
  }

  /**
   * Получить настройку по ключу
   */
  async getByKey(key: string) {
    return this.prisma.systemSettings.findUnique({
      where: { key },
    });
  }

  /**
   * Обновить или создать настройку
   */
  async upsert(key: string, value: string, description?: string) {
    return this.prisma.systemSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
  }

  /**
   * Обновить настройки реферальной программы
   */
  async updateReferralSettings(data: {
    bonusPercent: number;
    minPayout: number;
    enabled: boolean;
  }) {
    await Promise.all([
      this.upsert(
        'REFERRAL_BONUS_PERCENT',
        data.bonusPercent.toString(),
        'Процент реферального бонуса'
      ),
      this.upsert(
        'REFERRAL_MIN_PAYOUT',
        data.minPayout.toString(),
        'Минимальная сумма для вывода бонусов'
      ),
      this.upsert(
        'REFERRAL_ENABLED',
        data.enabled.toString(),
        'Включена ли реферальная программа'
      ),
    ]);

    return { success: true, data };
  }

  /**
   * Получить настройки реферальной программы
   */
  async getReferralSettings() {
    const [bonusPercent, minPayout, enabled] = await Promise.all([
      this.getByKey('REFERRAL_BONUS_PERCENT'),
      this.getByKey('REFERRAL_MIN_PAYOUT'),
      this.getByKey('REFERRAL_ENABLED'),
    ]);

    return {
      bonusPercent: bonusPercent ? parseFloat(bonusPercent.value) : 5,
      minPayout: minPayout ? parseFloat(minPayout.value) : 500,
      enabled: enabled ? enabled.value === 'true' : true,
    };
  }

  // =====================================================
  // НАСТРОЙКИ ЦЕНООБРАЗОВАНИЯ
  // =====================================================

  /**
   * Получить настройки ценообразования
   */
  async getPricingSettings() {
    const [exchangeRate, defaultMarkup] = await Promise.all([
      this.getByKey('EXCHANGE_RATE_USD_RUB'),
      this.getByKey('DEFAULT_MARKUP_PERCENT'),
    ]);

    return {
      exchangeRate: exchangeRate ? parseFloat(exchangeRate.value) : 95,
      defaultMarkupPercent: defaultMarkup ? parseFloat(defaultMarkup.value) : 30,
    };
  }

  /**
   * Обновить настройки ценообразования
   */
  async updatePricingSettings(data: {
    exchangeRate: number;
    defaultMarkupPercent: number;
  }) {
    await Promise.all([
      this.upsert(
        'EXCHANGE_RATE_USD_RUB',
        data.exchangeRate.toString(),
        'Курс USD/RUB для расчета цен'
      ),
      this.upsert(
        'DEFAULT_MARKUP_PERCENT',
        data.defaultMarkupPercent.toString(),
        'Наценка по умолчанию при синхронизации (%)'
      ),
    ]);

    return { success: true, data };
  }

  // =====================================================
  // АВТОМАТИЧЕСКИЙ КУРС ВАЛЮТ (ЦБ РФ)
  // =====================================================

  /**
   * Получить актуальный курс USD/RUB с ЦБ РФ
   */
  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const statusText = error.response?.statusText;
      if (status) return `${status}${statusText ? ` ${statusText}` : ''}: ${error.message}`;
      return error.message;
    }

    if (error instanceof Error) return error.message;

    return 'Неизвестная ошибка';
  }

  private parseUsdRateFromDailyJson(payload: unknown): { rate: number; date: string } {
    const usdRate = typeof payload === 'object' && payload !== null
      ? (payload as { Valute?: { USD?: { Value?: number } }; Date?: string }).Valute?.USD?.Value
      : undefined;
    const date = typeof payload === 'object' && payload !== null
      ? (payload as { Date?: string }).Date
      : undefined;

    if (typeof usdRate !== 'number' || !Number.isFinite(usdRate)) {
      throw new Error('В ответе daily_json.js отсутствует курс USD');
    }

    if (!date) {
      throw new Error('В ответе daily_json.js отсутствует дата курса');
    }

    return {
      rate: Math.round(usdRate * 100) / 100,
      date,
    };
  }

  private parseUsdRateFromXml(payload: string): { rate: number; date: string } {
    const usdBlockMatch = payload.match(/<CharCode>\s*USD\s*<\/CharCode>[\s\S]*?<Value>([\d,]+)<\/Value>/i);
    const dateMatch = payload.match(/<ValCurs[^>]*Date="([^"]+)"/i);

    if (!usdBlockMatch?.[1]) {
      throw new Error('В ответе XML_daily.asp отсутствует курс USD');
    }

    const normalizedRate = Number.parseFloat(usdBlockMatch[1].replace(',', '.'));
    if (!Number.isFinite(normalizedRate)) {
      throw new Error('Не удалось распарсить курс USD из XML_daily.asp');
    }

    return {
      rate: Math.round(normalizedRate * 100) / 100,
      date: dateMatch?.[1] || new Date().toISOString(),
    };
  }

  async fetchExchangeRateFromCBR(): Promise<{ rate: number; date: string }> {
    this.logger.log('💱 Запрос курса USD/RUB с ЦБ РФ...');

    try {
      const response = await axios.get('https://www.cbr-xml-daily.ru/daily_json.js', {
        timeout: 10000,
      });
      const parsed = this.parseUsdRateFromDailyJson(response.data);
      this.logger.log(`✅ Курс USD/RUB: ${parsed.rate}₽ (на ${parsed.date}, источник: cbr-xml-daily.ru)`);
      return parsed;
    } catch (primaryError) {
      this.logger.warn(`⚠️ Не удалось получить курс из cbr-xml-daily.ru: ${this.getErrorMessage(primaryError)}`);
    }

    try {
      const fallbackResponse = await axios.get('https://www.cbr.ru/scripts/XML_daily.asp', {
        timeout: 10000,
        responseType: 'text',
      });
      const parsed = this.parseUsdRateFromXml(fallbackResponse.data);
      this.logger.log(`✅ Курс USD/RUB: ${parsed.rate}₽ (на ${parsed.date}, источник: cbr.ru)`);
      return parsed;
    } catch (fallbackError) {
      const message = this.getErrorMessage(fallbackError);
      this.logger.error(`❌ Ошибка получения курса с ЦБ РФ: ${message}`);
      throw new Error(message);
    }
  }

  /**
   * Обновить курс в БД с ЦБ РФ
   */
  async updateExchangeRateFromCBR(): Promise<{ success: boolean; rate: number; date: string }> {
    try {
      const { rate, date } = await this.fetchExchangeRateFromCBR();
      
      // Сохраняем в БД
      await this.upsert(
        'EXCHANGE_RATE_USD_RUB',
        rate.toString(),
        `Курс USD/RUB (ЦБ РФ, обновлено: ${new Date().toISOString()})`
      );
      
      // Сохраняем дату последнего обновления
      await this.upsert(
        'EXCHANGE_RATE_UPDATED_AT',
        new Date().toISOString(),
        'Дата последнего обновления курса'
      );
      
      this.logger.log(`✅ Курс обновлен в БД: ${rate}₽`);
      
      return { success: true, rate, date };
    } catch (error) {
      this.logger.error(`❌ Ошибка обновления курса: ${this.getErrorMessage(error)}`);
      return { success: false, rate: 0, date: '' };
    }
  }

  /**
   * Получить информацию о курсе (текущий + когда обновлен)
   */
  async getExchangeRateInfo() {
    const [rateSetting, updatedAtSetting, autoUpdateSetting] = await Promise.all([
      this.getByKey('EXCHANGE_RATE_USD_RUB'),
      this.getByKey('EXCHANGE_RATE_UPDATED_AT'),
      this.getByKey('auto_update_exchange_rate'),
    ]);

    return {
      rate: rateSetting ? parseFloat(rateSetting.value) : 95,
      updatedAt: updatedAtSetting?.value || null,
      autoUpdate: autoUpdateSetting?.value === 'true',
      source: 'ЦБ РФ',
    };
  }

  /**
   * Включить/выключить автообновление курса
   */
  async setAutoUpdateExchangeRate(enabled: boolean) {
    await this.upsert(
      'auto_update_exchange_rate',
      enabled ? 'true' : 'false',
      'Автоматическое обновление курса раз в сутки (9:00)'
    );
    
    this.logger.log(`🔄 Автообновление курса ${enabled ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО'}`);
    
    return {
      success: true,
      autoUpdate: enabled,
      message: `Автообновление курса ${enabled ? 'включено (ежедневно в 9:00)' : 'выключено'}`,
    };
  }
}
