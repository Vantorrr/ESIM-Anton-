import { OrderStatus } from '@prisma/client';
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
      update: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: 'order_1',
          status: data.status,
          ...data,
        }),
      ),
    },
    user: {
      update: jest.fn().mockResolvedValue(undefined),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  const productsService = {
    findById: jest.fn(),
  };

  const usersService = {
    findById: jest.fn(),
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
  };
}

describe('OrdersService.fulfillOrder Phase 4 wiring', () => {
  beforeEach(() => jest.clearAllMocks());

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
    const {
      service,
      prisma,
      referralsService,
      loyaltyService,
      emailService,
    } = makeService();
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
