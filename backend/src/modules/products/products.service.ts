import { Injectable, NotFoundException, Logger, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { EsimProviderService } from '../esim-provider/esim-provider.service';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => EsimProviderService))
    private esimProviderService: EsimProviderService,
  ) {}

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
      isActive: filters?.isActive ?? true,
      ...(filters?.country && { country: filters.country }),
    };

    return this.prisma.esimProduct.findMany({
      where,
      orderBy: [{ country: 'asc' }, { ourPrice: 'asc' }],
    });
  }

  async getCountries() {
    const products = await this.prisma.esimProduct.findMany({
      where: { isActive: true },
      select: { country: true },
      distinct: ['country'],
      orderBy: { country: 'asc' },
    });

    return products.map((p) => p.country);
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
   * СИНХРОНИЗАЦИЯ V3 - ИСПРАВЛЕННАЯ ЛОГИКА
   * Volume приходит в KB из eSIM Access API
   * Price приходит в центах USD
   */
  async syncWithProvider() {
    this.logger.log('🔄 [SYNC V3] Начало синхронизации...');
    
    try {
      const packages = await this.esimProviderService.getPackages();
      
      if (!packages || packages.length === 0) {
        return { success: false, synced: 0, errors: 1, message: 'Не удалось получить список пакетов' };
      }

      this.logger.log(`📦 Получено ${packages.length} пакетов от API`);
      
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
          // КОНВЕРТАЦИЯ ЦЕНЫ (центы USD -> рубли)
          // ============================================
          // API возвращает price в центах USD
          // Наценка 40%, курс ~100 руб/USD
          
          const priceInCents = Number(pkg.price) || 0;
          const priceInUSD = priceInCents / 100;
          const priceWithMarkup = priceInUSD * 1.4; // +40% наценка
          const priceInRUB = Math.round(priceWithMarkup * 100); // Курс ~100 руб/$
          
          // DEBUG: первый пакет
          if (synced === 0) {
            this.logger.warn(`🔍 [SYNC V3] Первый пакет:`);
            this.logger.warn(`   name: ${pkg.name}`);
            this.logger.warn(`   volume: ${volumeInKB} KB -> ${volumeInMB} MB -> ${volumeInGB} GB -> "${dataAmount}"`);
            this.logger.warn(`   price: ${priceInCents} cents -> $${priceInUSD} -> ₽${priceInRUB}`);
          }
          
          const productData = {
            country: pkg.locationCode || pkg.location || 'Unknown',
            name: pkg.name || pkg.slug,
            description: `${dataAmount} на ${pkg.duration} дней`,
            dataAmount: dataAmount,
            validityDays: pkg.duration,
            providerPrice: priceInCents,
            ourPrice: priceInRUB,
            providerId: pkg.packageCode,
            providerName: 'esimaccess',
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
      
      this.logger.log(`✅ [SYNC V3] Готово: ${synced} синхронизировано, ${errors} ошибок`);
      
      return { 
        success: true,
        synced, 
        errors,
        message: `Синхронизировано ${synced} продуктов`,
      };
    } catch (error) {
      this.logger.error('❌ [SYNC V3] Ошибка:', error.message);
      return {
        success: false,
        synced: 0,
        errors: 1,
        message: error.message,
      };
    }
  }
}
