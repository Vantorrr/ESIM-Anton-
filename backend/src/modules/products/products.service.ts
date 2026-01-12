import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

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
   * Импорт продуктов от провайдера (заглушка, потом реализуем)
   */
  async syncWithProvider() {
    // TODO: Интеграция с API провайдера
    return { message: 'Синхронизация будет реализована после получения API' };
  }
}
