import { Injectable, NotFoundException, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { EsimProviderService } from '../esim-provider/esim-provider.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EsimProviderService))
    private esimProviderService: EsimProviderService,
    private systemSettingsService: SystemSettingsService,
  ) {}

  /**
   * Получить настройки ценообразования из БД
   */
  private async getPricingSettings() {
    return this.systemSettingsService.getPricingSettings();
  }

  async onModuleInit() {
    setTimeout(async () => {
      try {
        this.logger.log('🚀 Автоматическая синхронизация тарифов...');
        await this.syncWithProvider();
      } catch (error) {
        this.logger.error('❌ Ошибка автосинхронизации:', error.message);
      }
    }, 5000);
  }

  async findAll(filters?: { country?: string; isActive?: boolean }) {
    const where: Prisma.EsimProductWhereInput = {
      // Если isActive не указан явно - возвращаем ВСЕ продукты (для админки)
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.country && { country: filters.country }),
    };

    return this.prisma.esimProduct.findMany({
      where,
      orderBy: [{ country: 'asc' }, { ourPrice: 'asc' }],
    });
  }

  async getCountries() {
    // Возвращаем ВСЕ страны (включая неактивные продукты) для админки
    const products = await this.prisma.esimProduct.findMany({
      select: { country: true },
      distinct: ['country'],
      orderBy: { country: 'asc' },
    });

    return products.map((p) => p.country);
  }

  // =====================================================
  // МАССОВЫЕ ОПЕРАЦИИ
  // =====================================================

  /**
   * Массовое включение/выключение продуктов
   */
  async bulkUpdateActive(ids: string[], isActive: boolean) {
    this.logger.log(`🔄 Массовое ${isActive ? 'включение' : 'выключение'} ${ids.length} продуктов...`);
    
    const result = await this.prisma.esimProduct.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });

    this.logger.log(`✅ Обновлено ${result.count} продуктов`);
    
    return {
      success: true,
      updated: result.count,
      message: `${isActive ? 'Активировано' : 'Деактивировано'} ${result.count} продуктов`,
    };
  }

  /**
   * Включить/выключить ВСЕ тарифы по типу (стандартные или безлимитные)
   */
  async bulkToggleByType(tariffType: 'standard' | 'unlimited', isActive: boolean) {
    const isUnlimited = tariffType === 'unlimited';
    const typeName = isUnlimited ? 'безлимитных' : 'стандартных';
    
    this.logger.log(`🔄 ${isActive ? 'Включение' : 'Выключение'} ВСЕХ ${typeName} тарифов...`);
    
    const result = await this.prisma.esimProduct.updateMany({
      where: { isUnlimited },
      data: { isActive },
    });

    this.logger.log(`✅ ${isActive ? 'Включено' : 'Выключено'} ${result.count} ${typeName} тарифов`);
    
    return {
      success: true,
      updated: result.count,
      tariffType,
      isActive,
      message: `${isActive ? 'Включено' : 'Выключено'} ${result.count} ${typeName} тарифов`,
    };
  }

  /**
   * Массовая установка бейджа
   */
  async bulkSetBadge(ids: string[], badge: string | null, badgeColor: string | null) {
    this.logger.log(`🏷️ Массовая установка бейджа "${badge}" для ${ids.length} продуктов...`);
    
    const result = await this.prisma.esimProduct.updateMany({
      where: { id: { in: ids } },
      data: { badge, badgeColor },
    });

    this.logger.log(`✅ Обновлено ${result.count} продуктов`);
    
    return {
      success: true,
      updated: result.count,
      message: badge 
        ? `Бейдж "${badge}" установлен для ${result.count} продуктов`
        : `Бейдж удален у ${result.count} продуктов`,
    };
  }

  /**
   * Массовая установка наценки (пересчет ourPrice)
   */
  async bulkSetMarkup(ids: string[], markupPercent: number) {
    this.logger.log(`💰 Массовая установка наценки ${markupPercent}% для ${ids.length} продуктов...`);
    
    // Получаем настройки из БД
    const pricingSettings = await this.getPricingSettings();
    const exchangeRate = pricingSettings.exchangeRate;
    
    this.logger.log(`📊 Курс USD/RUB: ${exchangeRate}`);
    
    // Получаем все продукты
    const products = await this.prisma.esimProduct.findMany({
      where: { id: { in: ids } },
    });

    let updated = 0;

    for (const product of products) {
      const providerPriceUSD = Number(product.providerPrice) / 100; // центы -> доллары
      const priceWithMarkup = providerPriceUSD * (1 + markupPercent / 100);
      const newPrice = Math.round(priceWithMarkup * exchangeRate);

      await this.prisma.esimProduct.update({
        where: { id: product.id },
        data: { ourPrice: newPrice },
      });
      updated++;
    }

    this.logger.log(`✅ Обновлено ${updated} продуктов с наценкой ${markupPercent}%`);
    
    return {
      success: true,
      updated,
      message: `Наценка ${markupPercent}% применена к ${updated} продуктам (курс: ${exchangeRate}₽/$)`,
    };
  }

  async findByCountry(country: string) {
    return this.prisma.esimProduct.findMany({
      where: {
        country,
        isActive: true,
      },
      orderBy: { ourPrice: 'asc' },
    });
  }

  async findById(id: string) {
    const product = await this.prisma.esimProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Продукт не найден');
    }

    return product;
  }

  async create(data: Prisma.EsimProductCreateInput) {
    return this.prisma.esimProduct.create({
      data,
    });
  }

  async update(id: string, data: Prisma.EsimProductUpdateInput) {
    const product = await this.findById(id);

    return this.prisma.esimProduct.update({
      where: { id: product.id },
      data,
    });
  }

  async remove(id: string) {
    return this.update(id, { isActive: false });
  }

  /**
   * СИНХРОНИЗАЦИЯ V4 - STANDARD + UNLIMITED
   * Volume приходит в KB из eSIM Access API
   * Price приходит в центах USD
   * dataType: 1 = standard, 2 = unlimited/day pass
   */
  async syncWithProvider() {
    this.logger.log('🔄 [SYNC V8] Начало синхронизации (standard + unlimited отдельно)...');
    
    try {
      // Получаем настройки ценообразования из БД
      const pricingSettings = await this.getPricingSettings();
      const exchangeRate = pricingSettings.exchangeRate;
      const defaultMarkup = pricingSettings.defaultMarkupPercent;
      const markupMultiplier = 1 + defaultMarkup / 100;
      
      this.logger.log(`📊 Настройки: курс=${exchangeRate}₽/$, наценка=${defaultMarkup}%`);
      
      // Делаем 2 ОТДЕЛЬНЫХ запроса чтобы правильно определить тип тарифа
      // dataType=1 для стандартных, dataType=2 для безлимитных
      let standardPackages: any[] = [];
      let unlimitedPackages: any[] = [];
      
      // Пробуем получить стандартные тарифы
      try {
        standardPackages = await this.esimProviderService.getPackages(undefined, 1) || [];
        this.logger.log(`📦 Стандартных получено: ${standardPackages.length}`);
      } catch (err) {
        this.logger.warn(`⚠️ Не удалось получить стандартные тарифы: ${err.message}`);
        // Если не получилось с type=1, пробуем без фильтра
        try {
          standardPackages = await this.esimProviderService.getPackages() || [];
          this.logger.log(`📦 Получено без фильтра: ${standardPackages.length}`);
        } catch (err2) {
          this.logger.error(`❌ Полностью не удалось получить тарифы: ${err2.message}`);
        }
      }
      
      // Пробуем получить безлимитные тарифы (если провайдер поддерживает)
      try {
        unlimitedPackages = await this.esimProviderService.getPackages(undefined, 2) || [];
        this.logger.log(`📦 Безлимитных получено: ${unlimitedPackages.length}`);
      } catch (err) {
        this.logger.warn(`⚠️ Не удалось получить безлимитные тарифы: ${err.message}`);
        // Это нормально - не все провайдеры поддерживают безлимитные
      }
      
      // Объединяем с правильной маркировкой типа
      const allPackages = [
        ...standardPackages.map(p => ({ ...p, isUnlimitedFlag: false })),
        ...unlimitedPackages.map(p => ({ ...p, isUnlimitedFlag: true })),
      ];
      
      this.logger.log(`📦 Всего: ${allPackages.length} тарифов (${standardPackages.length} стандартных + ${unlimitedPackages.length} безлимитных)`);
      
      if (!allPackages || allPackages.length === 0) {
        return { success: false, synced: 0, errors: 1, message: 'Не удалось получить список пакетов' };
      }

      const packages = allPackages;
      this.logger.log(`📦 Всего ${packages.length} пакетов для синхронизации`);
      
      let synced = 0;
      let errors = 0;
      
      for (const pkg of packages) {
        try {
          // ============================================
          // КОНВЕРТАЦИЯ ОБЪЁМА (volume в KB -> GB/MB)
          // ============================================
          // API возвращает volume в КИЛОБАЙТАХ!
          // 512000 KB = 500 MB
          // 1048576 KB = 1024 MB = 1 GB
          // 20971520 KB = 20480 MB = 20 GB
          
          const volumeInKB = Number(pkg.volume) || 0;
          const volumeInMB = volumeInKB / 1024;
          const volumeInGB = volumeInMB / 1024;
          
          let dataAmount: string;
          if (volumeInGB >= 1) {
            // 1 GB и больше - показываем в GB
            dataAmount = `${Math.round(volumeInGB)} GB`;
          } else {
            // Меньше 1 GB - показываем в MB
            dataAmount = `${Math.round(volumeInMB)} MB`;
          }
          
          // ============================================
          // КОНВЕРТАЦИЯ ЦЕНЫ (из настроек БД!)
          // ============================================
          // API eSIM Access: price в центах USD
          // Пример: 350 = $3.50
          
          const priceRaw = Number(pkg.price) || 0;
          const priceInUSD = priceRaw / 100;  // центы -> доллары
          const priceWithMarkup = priceInUSD * markupMultiplier;
          const priceInRUB = Math.round(priceWithMarkup * exchangeRate);
          
          // DEBUG: первый пакет
          if (synced === 0) {
            this.logger.warn(`🔍 [SYNC V7] Первый пакет:`);
            this.logger.warn(`   name: ${pkg.name}`);
            this.logger.warn(`   volume: ${volumeInKB} KB -> ${volumeInMB.toFixed(1)} MB -> ${volumeInGB.toFixed(2)} GB -> "${dataAmount}"`);
            this.logger.warn(`   price: ${priceRaw} -> $${priceInUSD.toFixed(2)} -> +${defaultMarkup}% -> $${priceWithMarkup.toFixed(2)} -> ₽${priceInRUB}`);
          }
          
          const productData = {
            country: pkg.locationCode || pkg.location || 'Unknown',
            name: pkg.name || pkg.slug,
            description: `${dataAmount} на ${pkg.duration} дней`,
            dataAmount: dataAmount,
            validityDays: pkg.duration,
            providerPrice: priceRaw,
            ourPrice: priceInRUB,
            providerId: pkg.packageCode,
            providerName: 'esimaccess',
            isUnlimited: (pkg as any).isUnlimitedFlag === true,  // Из нашей маркировки
            isActive: true,
          };
          
          const existing = await this.prisma.esimProduct.findFirst({
            where: { providerId: pkg.packageCode },
          });
          
          if (existing) {
            await this.prisma.esimProduct.update({
              where: { id: existing.id },
              data: productData,
            });
          } else {
            await this.prisma.esimProduct.create({
              data: productData,
            });
          }
          
          synced++;
        } catch (error) {
          this.logger.error(`Ошибка пакета ${pkg.packageCode}:`, error.message);
          errors++;
        }
      }
      
      // Считаем сколько стандартных и безлимитных
      const syncedStandard = (standardPackages || []).length;
      const syncedUnlimited = (unlimitedPackages || []).length;
      
      this.logger.log(`✅ [SYNC V8] Готово: ${synced} синхронизировано (${syncedStandard} стандартных + ${syncedUnlimited} безлимитных), ${errors} ошибок`);
      
      return { 
        success: true,
        synced, 
        errors,
        message: `Синхронизировано ${synced} продуктов: ${syncedStandard} стандартных + ${syncedUnlimited} безлимитных (курс: ${exchangeRate}₽/$)`,
        version: 'V8-SEPARATE-TYPES',
        settings: {
          exchangeRate,
          markupPercent: defaultMarkup,
        },
        breakdown: {
          standard: syncedStandard,
          unlimited: syncedUnlimited,
        },
      };
    } catch (error) {
      this.logger.error('❌ [SYNC V8] Ошибка:', error.message);
      return {
        success: false,
        synced: 0,
        errors: 1,
        message: error.message,
      };
    }
  }
}
