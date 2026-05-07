import { ReferralsService } from './referrals.service';
import { TransactionStatus, TransactionType } from '@prisma/client';

function makeService(settingsOverride?: Partial<{ bonusPercent: number; minPayout: number; enabled: boolean }>) {
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

  const service = new ReferralsService(prisma as any, systemSettingsService as any);

  return { service, prisma, systemSettingsService };
}

describe('ReferralsService.awardReferralBonus', () => {
  beforeEach(() => jest.clearAllMocks());

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
