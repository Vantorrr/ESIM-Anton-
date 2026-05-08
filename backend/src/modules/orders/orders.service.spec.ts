import { OrderStatus, TransactionStatus, TransactionType } from '@prisma/client';
import { OrdersService } from './orders.service';

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order_1',
    userId: 'user_1',
    status: OrderStatus.PAID,
    totalAmount: 100,
    periodNum: null,
    parentOrderId: null,
    topupPackageCode: null,
    product: {
      providerId: 'provider_plan_1',
      providerPrice: 10,
      country: 'Япония',
      dataAmount: '10 GB',
    },
    user: {
      id: 'user_1',
      email: 'user@example.com',
      telegramId: null,
      loyaltyLevel: {
        cashbackPercent: 10,
      },
      referredById: 'ref_1',
    },
    transactions: [],
    ...overrides,
  };
}

function makeService(orderOverrides: Record<string, unknown> = {}) {
  const prisma = {
    order: {
      findUnique: jest.fn().mockResolvedValue(makeOrder(orderOverrides)),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: 'order_1',
          status: data.status,
          ...data,
        }),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: 'order_1',
          ...data,
          product: { providerId: 'provider_plan_1', providerPrice: 10, isActive: true },
          user: { id: 'user_1' },
        }),
      ),
    },
    user: {
      update: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    transaction: {
      findMany: jest.fn().mockImplementation(({ where }: any) => {
        if (where?.status === TransactionStatus.PENDING) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      }),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn().mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        return arg({
          user: {
            findUnique: jest.fn().mockResolvedValue({ balance: 1000 }),
            update: jest.fn().mockResolvedValue(undefined),
          },
          order: {
            create: jest.fn().mockResolvedValue({
              id: 'order_1',
              userId: 'user_1',
              status: OrderStatus.PAID,
              product: { providerId: 'provider_plan_1', providerPrice: 10, isActive: true },
              user: { id: 'user_1' },
            }),
          },
          transaction: {
            create: jest.fn().mockResolvedValue(undefined),
          },
        });
      }
      return Promise.all(arg);
    }),
  };

  const productsService = {
    findById: jest.fn().mockResolvedValue({
      id: 'product_1',
      ourPrice: 100,
      providerPrice: 10,
      providerId: 'provider_plan_1',
      isActive: true,
      isUnlimited: false,
      country: 'Япония',
      dataAmount: '10 GB',
    }),
  };

  const usersService = {
    findById: jest.fn().mockResolvedValue({
      id: 'user_1',
      balance: 1000,
      bonusBalance: 100,
      loyaltyLevel: {
        discount: 0,
      },
    }),
    updateBalance: jest.fn().mockResolvedValue(undefined),
  };

  const esimProviderService = {
    purchaseEsim: jest.fn().mockResolvedValue({
      qr_code: 'qr',
      iccid: 'iccid-1',
      activation_code: 'act-1',
      order_id: 'provider-order-1',
      smdp_address: 'smdp.example',
    }),
  };

  const promoCodesService = {
    use: jest.fn(),
  };

  const telegramNotification = {
    sendEsimDetails: jest.fn().mockResolvedValue(undefined),
    sendTextNotification: jest.fn().mockResolvedValue(undefined),
  };

  const emailService = {
    sendEsimReady: jest.fn().mockResolvedValue(undefined),
  };

  const systemSettingsService = {
    getPricingSettings: jest.fn(),
    getReferralSettings: jest.fn().mockResolvedValue({
      bonusPercent: 5,
      minPayout: 500,
      enabled: true,
    }),
  };

  const referralsService = {
    awardReferralBonus: jest.fn().mockResolvedValue({ awarded: true, bonusAmount: 5 }),
  };

  const loyaltyService = {
    updateUserLevel: jest.fn().mockResolvedValue(undefined),
  };

  const service = new OrdersService(
    prisma as any,
    productsService as any,
    usersService as any,
    esimProviderService as any,
    promoCodesService as any,
    telegramNotification as any,
    emailService as any,
    systemSettingsService as any,
    referralsService as any,
    loyaltyService as any,
  );

  return {
    service,
    prisma,
    usersService,
    esimProviderService,
    emailService,
    referralsService,
    loyaltyService,
    systemSettingsService,
  };
}

describe('OrdersService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('fulfillOrder Phase 4 wiring', () => {
    it('начисляет cashback, referral bonus и пересчитывает loyalty level после successful purchase', async () => {
      const {
        service,
        prisma,
        usersService,
        referralsService,
        loyaltyService,
        emailService,
      } = makeService();

      const result = await service.fulfillOrder('order_1');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order_1' },
        data: expect.objectContaining({
          status: OrderStatus.COMPLETED,
          qrCode: 'qr',
          iccid: 'iccid-1',
          activationCode: 'act-1',
          providerOrderId: 'provider-order-1',
          smdpAddress: 'smdp.example',
          completedAt: expect.any(Date),
        }),
      });
      expect(usersService.updateBalance).toHaveBeenCalledWith('user_1', 10, 'bonusBalance');
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_1',
          orderId: 'order_1',
          type: TransactionType.BONUS_ACCRUAL,
          status: TransactionStatus.SUCCEEDED,
          amount: expect.anything(),
          metadata: {
            source: 'loyalty_cashback',
            cashbackPercent: 10,
          },
        }),
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { totalSpent: { increment: 100 } },
      });
      expect(referralsService.awardReferralBonus).toHaveBeenCalledWith('ref_1', 100, 'order_1');
      expect(loyaltyService.updateUserLevel).toHaveBeenCalledWith('user_1');
      expect(emailService.sendEsimReady).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(OrderStatus.COMPLETED);
    });

    it('не роняет completed order, если referral awarding падает после выдачи eSIM', async () => {
      const { service, prisma, referralsService, loyaltyService, emailService } = makeService();
      referralsService.awardReferralBonus.mockRejectedValue(new Error('referral unavailable'));

      const result = await service.fulfillOrder('order_1');

      expect(result.status).toBe(OrderStatus.COMPLETED);
      expect(loyaltyService.updateUserLevel).toHaveBeenCalledWith('user_1');
      expect(emailService.sendEsimReady).toHaveBeenCalledTimes(1);
      expect(prisma.order.update).toHaveBeenCalledTimes(1);
      expect(prisma.order.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: OrderStatus.FAILED }),
        }),
      );
    });
  });

  describe('bonus spending / minPayout', () => {
    it('разрешает тратить cashback независимо от minPayout', async () => {
      const { service, prisma } = makeService();
      prisma.transaction.findMany.mockImplementation(({ where }: any) => {
        if (where?.status === TransactionStatus.PENDING) return Promise.resolve([]);
        return Promise.resolve([
          {
            type: TransactionType.BONUS_ACCRUAL,
            status: TransactionStatus.SUCCEEDED,
            amount: 120,
            metadata: { source: 'loyalty_cashback' },
          },
          {
            type: TransactionType.REFERRAL_BONUS,
            status: TransactionStatus.SUCCEEDED,
            amount: 200,
            metadata: {},
          },
        ]);
      });

      const order = await service.create('user_1', 'product_1', 1, 80);

      expect(Number(order.bonusUsed)).toBe(80);
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user_1',
          orderId: 'order_1',
          type: TransactionType.BONUS_SPENT,
          status: TransactionStatus.PENDING,
          metadata: {
            source: 'order_bonus_hold',
            spentFromReferral: 0,
            spentFromCashback: 80,
          },
        }),
      });
    });

    it('не даёт тратить referral bonus ниже minPayout', async () => {
      const { service, prisma } = makeService();
      prisma.transaction.findMany.mockImplementation(({ where }: any) => {
        if (where?.status === TransactionStatus.PENDING) return Promise.resolve([]);
        return Promise.resolve([
          {
            type: TransactionType.REFERRAL_BONUS,
            status: TransactionStatus.SUCCEEDED,
            amount: 200,
            metadata: {},
          },
        ]);
      });

      const order = await service.create('user_1', 'product_1', 1, 80);

      expect(Number(order.bonusUsed)).toBe(0);
      expect(prisma.transaction.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: TransactionType.BONUS_SPENT,
          }),
        }),
      );
    });

    it('разрешает тратить referral bonus от minPayout и выше', async () => {
      const { service, prisma, systemSettingsService } = makeService();
      systemSettingsService.getReferralSettings.mockResolvedValue({
        bonusPercent: 5,
        minPayout: 300,
        enabled: true,
      });
      prisma.transaction.findMany.mockImplementation(({ where }: any) => {
        if (where?.status === TransactionStatus.PENDING) return Promise.resolve([]);
        return Promise.resolve([
          {
            type: TransactionType.REFERRAL_BONUS,
            status: TransactionStatus.SUCCEEDED,
            amount: 400,
            metadata: {},
          },
        ]);
      });

      const order = await service.create('user_1', 'product_1', 1, 80);

      expect(Number(order.bonusUsed)).toBe(80);
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: TransactionType.BONUS_SPENT,
          metadata: {
            source: 'order_bonus_hold',
            spentFromReferral: 80,
            spentFromCashback: 0,
          },
        }),
      });
    });

    it('корректно делит mixed wallet между cashback и referral part', async () => {
      const { service, prisma, systemSettingsService } = makeService();
      systemSettingsService.getReferralSettings.mockResolvedValue({
        bonusPercent: 5,
        minPayout: 300,
        enabled: true,
      });
      prisma.transaction.findMany.mockImplementation(({ where }: any) => {
        if (where?.status === TransactionStatus.PENDING) return Promise.resolve([]);
        return Promise.resolve([
          {
            type: TransactionType.BONUS_ACCRUAL,
            status: TransactionStatus.SUCCEEDED,
            amount: 40,
            metadata: { source: 'loyalty_cashback' },
          },
          {
            type: TransactionType.REFERRAL_BONUS,
            status: TransactionStatus.SUCCEEDED,
            amount: 500,
            metadata: {},
          },
        ]);
      });

      await service.create('user_1', 'product_1', 1, 70);

      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: TransactionType.BONUS_SPENT,
          metadata: {
            source: 'order_bonus_hold',
            spentFromReferral: 30,
            spentFromCashback: 40,
          },
        }),
      });
    });

    it('учитывает pending bonus hold как уже зарезервированный и не даёт потратить его повторно', async () => {
      const { service, prisma, systemSettingsService } = makeService();
      systemSettingsService.getReferralSettings.mockResolvedValue({
        bonusPercent: 5,
        minPayout: 300,
        enabled: true,
      });
      prisma.transaction.findMany.mockImplementation(({ where }: any) => {
        if (where?.status === TransactionStatus.PENDING) return Promise.resolve([]);
        return Promise.resolve([
          {
            type: TransactionType.REFERRAL_BONUS,
            status: TransactionStatus.SUCCEEDED,
            amount: 500,
            metadata: {},
          },
          {
            type: TransactionType.BONUS_SPENT,
            status: TransactionStatus.PENDING,
            amount: 400,
            metadata: {
              source: 'order_bonus_hold',
              spentFromReferral: 400,
              spentFromCashback: 0,
            },
          },
        ]);
      });

      const order = await service.create('user_1', 'product_1', 1, 200);

      expect(Number(order.bonusUsed)).toBe(0);
    });

    it('cancels stale pending holds and corresponding pending orders before reusing bonuses', async () => {
      const { service, prisma } = makeService();
      prisma.transaction.findMany.mockImplementation(({ where }: any) => {
        if (where?.status === TransactionStatus.PENDING) {
          return Promise.resolve([
            {
              id: 'hold_1',
              orderId: 'order_stale',
              order: {
                id: 'order_stale',
                status: OrderStatus.PENDING,
                createdAt: new Date(Date.now() - 31 * 60 * 1000),
              },
            },
          ]);
        }
        return Promise.resolve([]);
      });

      await service.findByUser('user_1');

      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['hold_1'] } },
        data: {
          status: TransactionStatus.CANCELLED,
          metadata: {
            releaseReason: 'payment_session_expired',
          },
        },
      });
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['order_stale'] },
          status: OrderStatus.PENDING,
        },
        data: {
          status: OrderStatus.CANCELLED,
          errorMessage: 'Payment session expired',
        },
      });
    });
  });
});
