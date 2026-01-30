import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class SystemSettingsService {
  constructor(private prisma: PrismaService) {}

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
}
