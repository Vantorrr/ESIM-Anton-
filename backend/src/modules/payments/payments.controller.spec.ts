import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAdminGuard } from '@/common/auth/jwt-user.guard';
import { PaymentsController } from './payments.controller';

describe('PaymentsController', () => {
  const paymentsService = {
    assertOrderOwnership: jest.fn(),
    createPayment: jest.fn(),
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
