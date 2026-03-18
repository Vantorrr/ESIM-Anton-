import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class PromoCodesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    code: string;
    discountPercent: number;
    maxUses?: number;
    expiresAt?: string;
  }) {
    const normalized = data.code.trim().toUpperCase();

    const existing = await this.prisma.promoCode.findUnique({
      where: { code: normalized },
    });
    if (existing) {
      throw new BadRequestException(`Промокод "${normalized}" уже существует`);
    }

    return this.prisma.promoCode.create({
      data: {
        code: normalized,
        discountPercent: data.discountPercent,
        maxUses: data.maxUses ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  async findAll() {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async validate(code: string) {
    const normalized = code.trim().toUpperCase();

    const promo = await this.prisma.promoCode.findUnique({
      where: { code: normalized },
    });

    if (!promo) {
      throw new NotFoundException('Промокод не найден');
    }

    if (!promo.isActive) {
      throw new BadRequestException('Промокод деактивирован');
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Срок действия промокода истёк');
    }

    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Промокод исчерпан');
    }

    return {
      valid: true,
      code: promo.code,
      discountPercent: promo.discountPercent,
    };
  }

  /**
   * Применить промокод: увеличить usedCount. Вызывается при создании заказа.
   */
  async use(code: string): Promise<number> {
    const normalized = code.trim().toUpperCase();

    const promo = await this.prisma.promoCode.findUnique({
      where: { code: normalized },
    });
    if (!promo || !promo.isActive) {
      throw new BadRequestException('Промокод недействителен');
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Срок действия промокода истёк');
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Промокод исчерпан');
    }

    await this.prisma.promoCode.update({
      where: { code: normalized },
      data: { usedCount: { increment: 1 } },
    });

    return promo.discountPercent;
  }

  async toggleActive(id: string, isActive: boolean) {
    return this.prisma.promoCode.update({
      where: { id },
      data: { isActive },
    });
  }

  async delete(id: string) {
    return this.prisma.promoCode.delete({ where: { id } });
  }
}
