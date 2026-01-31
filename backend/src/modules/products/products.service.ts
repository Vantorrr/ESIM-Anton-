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
    // Автосинхронизация отключена - данные уже в БД
    // Синхронизация запускается вручную через POST /api/products/sync
    const count = await this.prisma.esimProduct.count();
    this.logger.log(`📦 В базе ${count} продуктов. Автосинхронизация отключена.`);
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
    this.logger.log('🔄 [SYNC V10] Начало синхронизации (dataType=1 и dataType=2)...');
    
    try {
      // Получаем настройки ценообразования из БД
      const pricingSettings = await this.getPricingSettings();
      const exchangeRate = pricingSettings.exchangeRate;
      const defaultMarkup = pricingSettings.defaultMarkupPercent;
      const markupMultiplier = 1 + defaultMarkup / 100;
      
      this.logger.log(`📊 Настройки: курс=${exchangeRate}₽/$, наценка=${defaultMarkup}%`);
      
      // Делаем 2 запроса с правильным параметром dataType (из документации eSIM Access)
      // dataType=1 для стандартных, dataType=2 для Day Pass/Unlimited
      let standardPackages: any[] = [];
      let unlimitedPackages: any[] = [];
      
      try {
        this.logger.log('📦 Запрос стандартных тарифов (dataType=1)...');
        standardPackages = await this.esimProviderService.getPackages(undefined, 1) || [];
        this.logger.log(`✅ Стандартных получено: ${standardPackages.length}`);
      } catch (err) {
        this.logger.warn(`⚠️ Ошибка получения стандартных: ${err.message}`);
      }
      
      try {
        this.logger.log('📦 Запрос Day Pass/Unlimited тарифов (dataType=2)...');
        unlimitedPackages = await this.esimProviderService.getPackages(undefined, 2) || [];
        this.logger.log(`✅ Day Pass получено: ${unlimitedPackages.length}`);
      } catch (err) {
        this.logger.warn(`⚠️ Ошибка получения Day Pass: ${err.message}`);
      }
      
      // Объединяем с маркировкой типа
      const allPackages = [
        ...standardPackages.map(p => ({ ...p, isUnlimitedFlag: false })),
        ...unlimitedPackages.map(p => ({ ...p, isUnlimitedFlag: true })),
      ];
      
      if (allPackages.length === 0) {
        return { success: false, synced: 0, errors: 1, message: 'API провайдера не вернул тарифы. Проверьте баланс и API ключи.' };
      }
      
      this.logger.log(`📦 Всего: ${allPackages.length} (${standardPackages.length} стандартных + ${unlimitedPackages.length} Day Pass)`);
      
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
          // КОНВЕРТАЦИЯ ОБЪЁМА (volume в БАЙТАХ -> GB/MB)
          // ============================================
          // API возвращает volume в БАЙТАХ!
          // 524288000 bytes = 500 MB
          // 1073741824 bytes = 1 GB
          // 10737418240 bytes = 10 GB
          
          const volumeInBytes = Number(pkg.volume) || 0;
          const volumeInMB = volumeInBytes / (1024 * 1024);
          const volumeInGB = volumeInBytes / (1024 * 1024 * 1024);
          
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
          // API eSIM Access: price в сотых центах (1/10000 доллара)
          // Пример: 86500 = $8.65
          
          const priceRaw = Number(pkg.price) || 0;
          const priceInUSD = priceRaw / 10000;  // сотые центы -> доллары
          const priceWithMarkup = priceInUSD * markupMultiplier;
          const priceInRUB = Math.round(priceWithMarkup * exchangeRate);
          
          // DEBUG: первый пакет
          if (synced === 0) {
            this.logger.warn(`🔍 [SYNC V11] Первый пакет:`);
            this.logger.warn(`   name: ${pkg.name}`);
            this.logger.warn(`   volume: ${volumeInBytes} bytes -> ${volumeInMB.toFixed(1)} MB -> ${volumeInGB.toFixed(2)} GB -> "${dataAmount}"`);
            this.logger.warn(`   price: ${priceRaw} / 10000 = $${priceInUSD.toFixed(2)} -> +${defaultMarkup}% -> $${priceWithMarkup.toFixed(2)} -> ₽${priceInRUB}`);
          }
          
          // Определяем isUnlimited по названию (содержит /Day или Daily = Day Pass)
          const pkgName = pkg.name || pkg.slug || '';
          const isUnlimitedByName = pkgName.toLowerCase().includes('/day') || 
                                     pkgName.toLowerCase().includes('daily');
          
          const productData = {
            country: pkg.locationCode || pkg.location || 'Unknown',
            name: pkgName,
            description: `${dataAmount} на ${pkg.duration} дней`,
            dataAmount: dataAmount,
            validityDays: pkg.duration,
            providerPrice: priceRaw,
            ourPrice: priceInRUB,
            providerId: pkg.packageCode,
            providerName: 'esimaccess',
            isUnlimited: isUnlimitedByName,  // По названию, а не по источнику
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
      
      // Считаем сколько стандартных и безлимитных из синхронизированных
      const syncedStandard = standardPackages.length;
      const syncedUnlimited = unlimitedPackages.length;
      
      this.logger.log(`✅ [SYNC V10] Готово: ${synced} синхронизировано (${syncedStandard} стандартных + ${syncedUnlimited} Day Pass), ${errors} ошибок`);
      
      return { 
        success: true,
        synced, 
        errors,
        message: `Синхронизировано ${synced} продуктов: ${syncedStandard} стандартных + ${syncedUnlimited} Day Pass (курс: ${exchangeRate}₽/$)`,
        version: 'V10-DATATYPE-FIX',
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
      this.logger.error('❌ [SYNC V10] Ошибка:', error.message);
      return {
        success: false,
        synced: 0,
        errors: 1,
        message: error.message,
      };
    }
  }
}
