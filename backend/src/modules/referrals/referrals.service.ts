import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TransactionType, TransactionStatus } from '@prisma/client';

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Зарегистрировать реферала
   */
  async registerReferral(userId: string, referralCode: string) {
    // Находим реферера
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
    });

    if (!referrer || referrer.id === userId) {
      return null;
    }

    // Привязываем пользователя к рефереру
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        referredById: referrer.id,
      },
    });

    return referrer;
  }

  /**
   * Начислить реферальный бонус
   */
  async awardReferralBonus(referrerId: string, orderAmount: number) {
    const bonusPercent = this.configService.get<number>('REFERRAL_BONUS_PERCENT', 5);
    const bonusAmount = (orderAmount * bonusPercent) / 100;

    // Начисляем бонус рефереру
    await this.prisma.user.update({
      where: { id: referrerId },
      data: {
        bonusBalance: {
          increment: bonusAmount,
        },
      },
    });

    // Создаем транзакцию
    await this.prisma.transaction.create({
      data: {
        userId: referrerId,
        type: TransactionType.REFERRAL_BONUS,
        status: TransactionStatus.SUCCEEDED,
        amount: bonusAmount,
        metadata: {
          orderAmount,
          bonusPercent,
        },
      },
    });

    return { bonusAmount };
  }

  /**
   * Получить статистику реферальной программы для пользователя
   */
  async getReferralStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        referrals: {
          select: {
            id: true,
            username: true,
            firstName: true,
            createdAt: true,
            orders: {
              where: { status: 'COMPLETED' },
              select: {
                totalAmount: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    // Считаем общий заработок с рефералов
    const totalReferralEarnings = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.REFERRAL_BONUS,
        status: TransactionStatus.SUCCEEDED,
      },
      _sum: {
        amount: true,
      },
    });

    return {
      referralCode: user.referralCode,
      referralLink: `https://t.me/YOUR_BOT_USERNAME?start=${user.referralCode}`,
      referralsCount: user.referrals.length,
      totalEarnings: totalReferralEarnings._sum.amount || 0,
      referrals: user.referrals.map((ref) => ({
        id: ref.id,
        name: ref.firstName || ref.username || 'Пользователь',
        joinedAt: ref.createdAt,
        totalOrders: ref.orders.length,
        totalSpent: ref.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
      })),
    };
  }

  /**
   * Получить топ рефереров (для админки)
   */
  async getTopReferrers(limit = 10) {
    const referrers = await this.prisma.user.findMany({
      where: {
        referrals: {
          some: {},
        },
      },
      include: {
        _count: {
          select: {
            referrals: true,
          },
        },
      },
      orderBy: {
        referrals: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return referrers.map((user) => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      referralsCount: user._count.referrals,
      bonusBalance: user.bonusBalance,
    }));
  }
}
