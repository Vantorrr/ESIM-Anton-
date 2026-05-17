import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAdminGuard } from '@/common/auth/jwt-user.guard';
import { PaymentsController } from './payments.controller';

describe('PaymentsController', () => {
  const paymentsService = {
    assertOrderOwnership: jest.fn(),
    createPayment: jest.fn(),
    getActiveSavedCard: jest.fn(),
    chargeOrderWithSavedCard: jest.fn(),
    createBalanceTopupPayment: jest.fn(),
    prepareCloudPaymentsBalanceTopup: jest.fn(),
    handleWebhook: jest.fn(),
    findAll: jest.fn(),
    findByUser: jest.fn(),
  };

  const controller = new PaymentsController(paymentsService as any);

  beforeEach(() => jest.clearAllMocks());

  it('createPayment проверяет ownership orderId', async () => {
    paymentsService.createPayment.mockResolvedValue({ payment: { paymentId: 'pay_1' } });

    const result = await controller.createPayment(
      { id: 'user_1', type: 'user' },
      { orderId: 'order_1' },
    );

    expect(paymentsService.assertOrderOwnership).toHaveBeenCalledWith('order_1', 'user_1');
    expect(paymentsService.createPayment).toHaveBeenCalledWith('order_1');
    expect(result).toEqual({ payment: { paymentId: 'pay_1' } });
  });

  it('getActiveSavedCard читает карту текущего пользователя', async () => {
    paymentsService.getActiveSavedCard.mockResolvedValue({
      id: 'card_1',
      cardMask: '4242 42****** 4242',
      isActive: true,
    });

    const result = await controller.getActiveSavedCard({ id: 'user_1', type: 'user' });

    expect(paymentsService.getActiveSavedCard).toHaveBeenCalledWith('user_1');
    expect(result).toEqual({
      id: 'card_1',
      cardMask: '4242 42****** 4242',
      isActive: true,
    });
  });

  it('chargeOrderWithSavedCard использует user.id и маппит order в checkout shape', async () => {
    paymentsService.chargeOrderWithSavedCard.mockResolvedValue({
      success: true,
      fallbackToWidget: false,
      savedCard: {
        id: 'card_1',
        cardMask: '4242 42****** 4242',
        isActive: true,
      },
      message: 'ok',
      reasonCode: 0,
      orderModel: {
        id: 'order_1',
        userId: 'user_1',
        productId: 'product_1',
        status: 'PAID',
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
        createdAt: new Date('2026-05-17T00:00:00Z'),
        completedAt: null,
      },
    });

    const result = await controller.chargeOrderWithSavedCard(
      { id: 'user_1', type: 'user' },
      { orderId: 'order_1' },
    );

    expect(paymentsService.chargeOrderWithSavedCard).toHaveBeenCalledWith('user_1', 'order_1');
    expect(result).toMatchObject({
      success: true,
      fallbackToWidget: false,
      message: 'ok',
      reasonCode: 0,
      savedCard: {
        id: 'card_1',
      },
      order: {
        id: 'order_1',
        userId: 'user_1',
        productId: 'product_1',
        totalAmount: 100,
      },
    });
  });

  it('findAll использует JwtAdminGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, PaymentsController.prototype.findAll);
    expect(guards).toEqual([JwtAdminGuard]);
  });

  it('findByUser запрещает доступ к чужим транзакциям', async () => {
    await expect(
      controller.findByUser('user_2', { id: 'user_1', type: 'user' }),
    ).rejects.toThrow(ForbiddenException);
  });
});
