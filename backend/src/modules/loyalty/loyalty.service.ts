import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  /**
   * Получить все уровни лояльности
   */
  async getLevels() {
    return this.prisma.loyaltyLevel.findMany({
      orderBy: { minSpent: 'asc' },
    });
  }

  /**
   * Получить уровень по ID
   */
  async getLevelById(id: string) {
    const level = await this.prisma.loyaltyLevel.findUnique({
      where: { id },
    });

    if (!level) {
      throw new NotFoundException('Уровень лояльности не найден');
    }

    return level;
  }

  /**
   * Создать уровень лояльности
   */
  async createLevel(data: Prisma.LoyaltyLevelCreateInput) {
    return this.prisma.loyaltyLevel.create({
      data,
    });
  }

  /**
   * Обновить уровень лояльности
   */
  async updateLevel(id: string, data: Prisma.LoyaltyLevelUpdateInput) {
    await this.getLevelById(id); // Проверка существования

    return this.prisma.loyaltyLevel.update({
      where: { id },
      data,
    });
  }

  /**
   * Удалить уровень лояльности
   */
  async deleteLevel(id: string) {
    await this.getLevelById(id); // Проверка существования

    // Проверяем, есть ли пользователи с этим уровнем
    const usersCount = await this.prisma.user.count({
      where: { loyaltyLevelId: id },
    });

    if (usersCount > 0) {
      // Сбрасываем уровень у пользователей
      await this.prisma.user.updateMany({
        where: { loyaltyLevelId: id },
        data: { loyaltyLevelId: null },
      });
    }

    return this.prisma.loyaltyLevel.delete({
      where: { id },
    });
  }

  /**
   * Обновить уровень пользователя на основе его трат
   */
  async updateUserLevel(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    // Находим подходящий уровень
    const level = await this.prisma.loyaltyLevel.findFirst({
      where: {
        minSpent: {
          lte: user.totalSpent,
        },
      },
      orderBy: {
        minSpent: 'desc',
      },
    });

    if (level && level.id !== user.loyaltyLevelId) {
      // Обновляем уровень пользователя
      return this.prisma.user.update({
        where: { id: userId },
        data: {
          loyaltyLevelId: level.id,
        },
        include: {
          loyaltyLevel: true,
        },
      });
    }

    return user;
  }

  /**
   * Получить пользователей по уровню
   */
  async getUsersByLevel(levelId: string) {
    return this.prisma.user.findMany({
      where: { loyaltyLevelId: levelId },
      select: {
        id: true,
        username: true,
        firstName: true,
        totalSpent: true,
        bonusBalance: true,
      },
    });
  }
}
