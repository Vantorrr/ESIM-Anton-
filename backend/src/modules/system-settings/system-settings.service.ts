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
  async fetchExchangeRateFromCBR(): Promise<{ rate: number; date: string }> {
    try {
      this.logger.log('💱 Запрос курса USD/RUB с ЦБ РФ...');
      
      // Официальный API ЦБ РФ (бесплатный, без ключа)
      const response = await axios.get('https://www.cbr-xml-daily.ru/daily_json.js', {
        timeout: 10000,
      });
      
      const usdRate = response.data?.Valute?.USD?.Value;
      const date = response.data?.Date;
      
      if (!usdRate) {
        throw new Error('Не удалось получить курс USD');
      }
      
      const rate = Math.round(usdRate * 100) / 100; // Округление до 2 знаков
      
      this.logger.log(`✅ Курс USD/RUB: ${rate}₽ (на ${date})`);
      
      return { rate, date };
    } catch (error) {
      this.logger.error('❌ Ошибка получения курса с ЦБ РФ:', error.message);
      throw error;
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
      this.logger.error('❌ Ошибка обновления курса:', error.message);
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
