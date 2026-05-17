import { TransactionStatus, TransactionType, OrderStatus } from '@prisma/client';
import axios from 'axios';
import { PaymentsService } from './payments.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeService() {
  const prisma = {
    order: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    cloudPaymentsCardToken: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (callback: any) =>
      callback({
        transaction: {
          update: jest.fn().mockResolvedValue(undefined),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        order: {
          update: jest.fn().mockResolvedValue(undefined),
        },
        cloudPaymentsCardToken: {
          update: jest.fn().mockResolvedValue(undefined),
        },
      }),
    ),
  };

  const ordersService = {
    assertOwnership: jest.fn(),
    releaseBonusSpendHold: jest.fn().mockResolvedValue(undefined),
    fulfillOrder: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
  };

  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'CLOUDPAYMENTS_PUBLIC_ID') return 'pk_test';
      if (key === 'CLOUDPAYMENTS_API_SECRET') return 'sk_test';
      if (key === 'DEBUG_SENSITIVE_LOGS') return 'false';
      if (key === 'ROBOKASSA_TEST_MODE') return 'true';
      return '';
    }),
  };

  const telegramNotification = {
    sendTextNotification: jest.fn(),
    sendPaymentSuccessNotification: jest.fn(),
  };

  const pushService = {
    sendPaymentSuccess: jest.fn().mockResolvedValue(undefined),
  };

  const service = new PaymentsService(
    prisma as any,
    ordersService as any,
    configService as any,
    telegramNotification as any,
    pushService as any,
  );

  return { service, prisma, ordersService, pushService };
}

describe('PaymentsService saved card repeat charge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns active saved card summary for current user', async () => {
    const { service, prisma } = makeService();
    prisma.cloudPaymentsCardToken.findFirst.mockResolvedValue({
      id: 'card_1',
      userId: 'user_1',
      accountId: 'user_1',
      cloudPaymentsToken: 'tk_1',
      cardMask: '4242 42****** 4242',
      cardBrand: 'Visa',
      expMonth: 12,
      expYear: 2030,
      isActive: true,
      lastUsedAt: null,
    });

    const result = await service.getActiveSavedCard('user_1');

    expect(result).toEqual({
      id: 'card_1',
      cardMask: '4242 42****** 4242',
      cardBrand: 'Visa',
      expMonth: 12,
      expYear: 2030,
      isActive: true,
      lastUsedAt: null,
    });
  });

  it('falls back to widget and cancels order when no active saved card exists', async () => {
    const { service, prisma, ordersService } = makeService();
    prisma.order.findUnique.mockResolvedValue({
      id: 'order_1',
      userId: 'user_1',
      productId: 'product_1',
      status: OrderStatus.PENDING,
      quantity: 1,
      periodNum: null,
      productPrice: 100,
      discount: 0,
      promoCode: null,
      promoDiscount: 0,
      bonusUsed: 0,
      totalAmount: 100,
      parentOrderId: null,
      topupPackageCode: null,
      product: { name: 'Japan 10 GB', country: 'JP', dataAmount: '10 GB' },
      user: { id: 'user_1', email: 'user@example.com' },
      transactions: [],
    });
    prisma.cloudPaymentsCardToken.findFirst.mockResolvedValue(null);
    prisma.order.findUniqueOrThrow.mockResolvedValue({
      id: 'order_1',
      userId: 'user_1',
      productId: 'product_1',
      status: OrderStatus.CANCELLED,
      quantity: 1,
      periodNum: null,
      productPrice: 100,
      discount: 0,
      promoCode: null,
      promoDiscount: 0,
      bonusUsed: 0,
      totalAmount: 100,
      parentOrderId: null,
      topupPackageCode: null,
      createdAt: new Date(),
      completedAt: null,
    });

    const result = await service.chargeOrderWithSavedCard('user_1', 'order_1');

    expect(ordersService.releaseBonusSpendHold).toHaveBeenCalledWith(
      'order_1',
      'saved_card_fallback',
    );
    expect(result.success).toBe(false);
    expect(result.fallbackToWidget).toBe(true);
    expect(result.savedCard).toBeNull();
  });

  it('charges order with saved card and fulfills on provider success', async () => {
    const { service, prisma, ordersService, pushService } = makeService();
    prisma.order.findUnique.mockResolvedValue({
      id: 'order_1',
      userId: 'user_1',
      productId: 'product_1',
      status: OrderStatus.PENDING,
      quantity: 1,
      periodNum: null,
      productPrice: 100,
      discount: 0,
      promoCode: null,
      promoDiscount: 0,
      bonusUsed: 0,
      totalAmount: 100,
      parentOrderId: null,
      topupPackageCode: null,
      product: { name: 'Japan 10 GB', country: 'JP', dataAmount: '10 GB' },
      user: { id: 'user_1', email: 'user@example.com' },
      transactions: [],
    });
    prisma.transaction.create.mockResolvedValue({
      id: 'tx_1',
      orderId: 'order_1',
      type: TransactionType.PAYMENT,
      status: TransactionStatus.PENDING,
    });
    prisma.cloudPaymentsCardToken.findFirst.mockResolvedValue({
      id: 'card_1',
      userId: 'user_1',
      accountId: 'user_1',
      cloudPaymentsToken: 'tk_1',
      cardMask: '4242 42****** 4242',
      cardBrand: 'Visa',
      expMonth: 12,
      expYear: 2030,
      isActive: true,
      lastUsedAt: null,
    });
    mockedAxios.post.mockResolvedValue({
      data: {
        Success: true,
        Message: null,
        Model: {
          TransactionId: 777,
          ReasonCode: 0,
          CardHolderMessage: 'Оплата успешно проведена',
        },
      },
    } as any);
    prisma.order.findUniqueOrThrow.mockResolvedValue({
      id: 'order_1',
      userId: 'user_1',
      productId: 'product_1',
      status: OrderStatus.COMPLETED,
      quantity: 1,
      periodNum: null,
      productPrice: 100,
      discount: 0,
      promoCode: null,
      promoDiscount: 0,
      bonusUsed: 0,
      totalAmount: 100,
      parentOrderId: null,
      topupPackageCode: null,
      createdAt: new Date(),
      completedAt: new Date(),
    });

    const result = await service.chargeOrderWithSavedCard('user_1', 'order_1');

    expect(mockedAxios.post).toHaveBeenCalled();
    expect(ordersService.fulfillOrder).toHaveBeenCalledWith('order_1');
    expect(pushService.sendPaymentSuccess).toHaveBeenCalledWith('user_1', {
      orderId: 'order_1',
      productName: 'Japan 10 GB',
      country: 'JP',
      dataAmount: '10 GB',
      price: 100,
    });
    expect(result.success).toBe(true);
    expect(result.fallbackToWidget).toBe(false);
  });
});
