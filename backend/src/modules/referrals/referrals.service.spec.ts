import { ReferralsService } from './referrals.service';
import { TransactionStatus, TransactionType } from '@prisma/client';

function makeService(
  settingsOverride?: Partial<{ bonusPercent: number; minPayout: number; enabled: boolean }>,
) {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn(),
    },
    transaction: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
      aggregate: jest.fn(),
    },
  };

  const systemSettingsService = {
    getReferralSettings: jest.fn().mockResolvedValue({
      bonusPercent: 5,
      minPayout: 500,
      enabled: true,
      ...settingsOverride,
    }),
  };

  const configService = {
    get: jest.fn().mockImplementation((key: string, fallback?: string) => {
      if (key === 'TELEGRAM_BOT_USERNAME') return 'mojo_mobile_bot';
      return fallback;
    }),
  };

  const service = new ReferralsService(
    prisma as any,
    systemSettingsService as any,
    configService as any,
  );

  return { service, prisma, systemSettingsService, configService };
}

describe('ReferralsService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('registerReferral', () => {
    it('привязывает пользователя к рефереру, если он ещё не привязан', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique
        .mockResolvedValueOnce({ referredById: null, telegramId: BigInt(123456) })
        .mockResolvedValueOnce({ id: 'referrer_1', referralCode: 'REF123' });

      const result = await service.registerReferral('user_1', 'REF123', BigInt(123456));

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: {
          referredById: 'referrer_1',
        },
      });
      expect(result).toEqual({ id: 'referrer_1', referralCode: 'REF123' });
    });

    it('не перепривязывает уже привязанного пользователя', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValueOnce({
        referredById: 'existing_referrer',
        telegramId: BigInt(123456),
      });

      const result = await service.registerReferral('user_1', 'REF123', BigInt(123456));

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('не допускает self-referral', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique
        .mockResolvedValueOnce({ referredById: null, telegramId: BigInt(123456) })
        .mockResolvedValueOnce({ id: 'user_1', referralCode: 'REF123' });

      const result = await service.registerReferral('user_1', 'REF123', BigInt(123456));

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('отклоняет bot registration при несовпадении telegram identity', async () => {
      const { service, prisma } = makeService();
      prisma.user.findUnique.mockResolvedValueOnce({
        referredById: null,
        telegramId: BigInt(111111),
      });

      await expect(
        service.registerReferral('user_1', 'REF123', BigInt(222222)),
      ).rejects.toThrow('Telegram identity mismatch');
    });
  });

  describe('awardReferralBonus', () => {
    it('читает referral settings из SystemSettings и создаёт bonus transaction', async () => {
      const { service, prisma, systemSettingsService } = makeService({
        bonusPercent: 7,
        minPayout: 900,
        enabled: true,
      });

      const result = await service.awardReferralBonus('ref_1', 1200, 'order_1');

      expect(systemSettingsService.getReferralSettings).toHaveBeenCalledTimes(1);
      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'ref_1',
          orderId: 'order_1',
          type: TransactionType.REFERRAL_BONUS,
          status: TransactionStatus.SUCCEEDED,
        },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'ref_1' },
        data: {
          bonusBalance: {
            increment: 84,
          },
        },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'ref_1',
          orderId: 'order_1',
          type: TransactionType.REFERRAL_BONUS,
          status: TransactionStatus.SUCCEEDED,
          amount: 84,
          metadata: {
            orderAmount: 1200,
            bonusPercent: 7,
            minPayout: 900,
            source: 'completed_order',
          },
        },
      });
      expect(result).toEqual({ awarded: true, bonusAmount: 84 });
    });

    it('ничего не делает, если referral program выключена', async () => {
      const { service, prisma } = makeService({ enabled: false });

      const result = await service.awardReferralBonus('ref_1', 1200, 'order_1');

      expect(prisma.transaction.findFirst).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(result).toEqual({ awarded: false, reason: 'disabled', bonusAmount: 0 });
    });

    it('не начисляет бонус повторно для того же completed order', async () => {
      const { service, prisma } = makeService();
      prisma.transaction.findFirst.mockResolvedValue({
        amount: 60,
      });

      const result = await service.awardReferralBonus('ref_1', 1200, 'order_1');

      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        awarded: false,
        reason: 'already-awarded',
        bonusAmount: 60,
      });
    });
  });

  describe('getReferralStats', () => {
    it('возвращает runtime-backed referral stats shape для client', async () => {
      const { service, prisma, configService } = makeService({
        bonusPercent: 9,
        minPayout: 700,
        enabled: true,
      });
      prisma.user.findUnique.mockResolvedValue({
        referralCode: 'REF123',
        referrals: [
          {
            id: 'user_2',
            username: 'alex',
            firstName: 'Alex',
            createdAt: new Date('2026-05-01T00:00:00Z'),
            orders: [{ totalAmount: 100 }, { totalAmount: 250 }],
          },
        ],
      });
      prisma.transaction.aggregate.mockResolvedValue({
        _sum: {
          amount: 55,
        },
      });

      const result = await service.getReferralStats('user_1');

      expect(configService.get).toHaveBeenCalledWith(
        'TELEGRAM_BOT_USERNAME',
        'mojo_mobile_bot',
      );
      expect(result).toEqual({
        referralCode: 'REF123',
        referralLink: 'https://t.me/mojo_mobile_bot?start=ref_REF123',
        referralsCount: 1,
        totalEarnings: 55,
        referralPercent: 9,
        enabled: true,
        minPayout: 700,
        referrals: [
          {
            id: 'user_2',
            name: 'Alex',
            joinedAt: new Date('2026-05-01T00:00:00Z'),
            totalOrders: 2,
            totalSpent: 350,
          },
        ],
      });
    });
  });
});
