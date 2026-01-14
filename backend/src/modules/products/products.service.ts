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

  /**
   * Автоматическая синхронизация при запуске
   */
  async onModuleInit() {
    // Синхронизируем в фоне чтобы не блокировать запуск
    setTimeout(async () => {
      try {
        this.logger.log('🚀 Автоматическая синхронизация тарифов...');
        await this.syncWithProvider();
      } catch (error) {
        this.logger.error('❌ Ошибка автосинхронизации:', error.message);
      }
    }, 5000); // Через 5 секунд после запуска
  }

  /**
   * Получить все активные продукты
   */
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

  /**
   * Получить список стран
   */
  async getCountries() {
    const products = await this.prisma.esimProduct.findMany({
      where: { isActive: true },
      select: { country: true },
      distinct: ['country'],
      orderBy: { country: 'asc' },
    });

    return products.map((p) => p.country);
  }

  /**
   * Получить продукты по стране
   */
  async findByCountry(country: string) {
    return this.prisma.esimProduct.findMany({
      where: {
        country,
        isActive: true,
      },
      orderBy: { ourPrice: 'asc' },
    });
  }

  /**
   * Получить продукт по ID
   */
  async findById(id: string) {
    const product = await this.prisma.esimProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Продукт не найден');
    }

    return product;
  }

  /**
   * Создать продукт
   */
  async create(data: Prisma.EsimProductCreateInput) {
    return this.prisma.esimProduct.create({
      data,
    });
  }

  /**
   * Обновить продукт
   */
  async update(id: string, data: Prisma.EsimProductUpdateInput) {
    const product = await this.findById(id);

    return this.prisma.esimProduct.update({
      where: { id: product.id },
      data,
    });
  }

  /**
   * Удалить продукт (мягкое удаление - делаем неактивным)
   */
  async remove(id: string) {
    return this.update(id, { isActive: false });
  }

  /**
   * Импорт продуктов от провайдера eSIM Access
   */
  async syncWithProvider() {
    try {
      this.logger.log('🔄 Начало синхронизации с eSIM Access API...');
      
      const packages = await this.esimProviderService.getPackages();
      
      let synced = 0;
      let errors = 0;
      
      for (const pkg of packages) {
        try {
          // Ищем существующий продукт по providerId
          const existing = await this.prisma.esimProduct.findFirst({
            where: { providerId: pkg.packageCode },
          });
          
          // DEBUG: Логируем первый пакет (v1.0.1 FIX)
          if (synced === 0) {
            this.logger.warn(`🔍 DEBUG первого пакета (v1.0.1):`);
            this.logger.warn(`  volume: ${pkg.volume} (тип: ${typeof pkg.volume})`);
            this.logger.warn(`  price: ${pkg.price} (тип: ${typeof pkg.price})`);
            this.logger.warn(`  name: ${pkg.name}`);
          }
          
          // Volume из API в KB!!! (512000 KB = 500 MB, 20971520 KB = 20 GB)
          const volumeKB = Number(pkg.volume);
          const volumeMB = volumeKB / 1024;
          const volumeGB = volumeMB / 1024;
          
          let dataAmount: string;
          if (volumeGB >= 1) {
            dataAmount = `${Math.round(volumeGB)} GB`;
          } else {
            dataAmount = `${Math.round(volumeMB)} MB`;
          }
          
          // DEBUG первого
          if (synced === 0) {
            this.logger.warn(`  volumeKB: ${volumeKB}`);
            this.logger.warn(`  volumeMB: ${volumeMB}`);
            this.logger.warn(`  volumeGB: ${volumeGB}`);
            this.logger.warn(`  dataAmount: ${dataAmount}`);
          }
          
          const productData = {
            country: pkg.location || pkg.locationCode || 'Unknown',
            name: pkg.name || pkg.slug,
            description: `${dataAmount} на ${pkg.duration} ${pkg.durationUnit === 'DAY' ? 'дней' : pkg.durationUnit}`,
            dataAmount: dataAmount,
            validityDays: pkg.duration,
            providerPrice: pkg.price,
            ourPrice: Math.round(pkg.price * 1.4 * 100) / 100,
            providerId: pkg.packageCode,
            providerName: 'esimaccess',
            isActive: true,
          };
          
          if (existing) {
            // Обновляем
            await this.prisma.esimProduct.update({
              where: { id: existing.id },
              data: productData,
            });
          } else {
            // Создаём новый
            await this.prisma.esimProduct.create({
              data: productData,
            });
          }
          
          synced++;
        } catch (error) {
          this.logger.error(`Ошибка синхронизации пакета ${pkg.packageCode}:`, error.message);
          errors++;
        }
      }
      
      this.logger.log(`✅ Синхронизация завершена: ${synced} обновлено, ${errors} ошибок`);
      
      return { 
        success: true,
        synced, 
        errors,
        message: `Синхронизировано ${synced} продуктов`,
      };
    } catch (error) {
      this.logger.error('❌ Ошибка синхронизации:', error.message);
      return {
        success: false,
        synced: 0,
        errors: 1,
        message: error.message,
      };
    }
  }
}
