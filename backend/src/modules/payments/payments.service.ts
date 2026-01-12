import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { TransactionType, TransactionStatus, OrderStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private configService: ConfigService,
  ) {}

  /**
   * Создать платеж для заказа (ЮKassa)
   */
  async createPayment(orderId: string) {
    const order = await this.ordersService.findById(orderId);

    if (!order) {
      throw new BadRequestException('Заказ не найден');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Заказ уже обработан');
    }

    // Создаем транзакцию
    const transaction = await this.prisma.transaction.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.PENDING,
        amount: order.totalAmount,
        paymentProvider: 'yukassa',
      },
    });

    // TODO: Интеграция с ЮKassa
    // Здесь будет запрос к API ЮKassa для создания платежа
    
    // Временная заглушка (мок)
    const mockPaymentUrl = `https://yoomoney.ru/checkout/payments/v2/contract?orderId=${order.id}`;
    
    const mockPaymentData = {
      paymentId: `mock_${transaction.id}`,
      paymentUrl: mockPaymentUrl,
      amount: Number(order.totalAmount),
      currency: 'RUB',
    };

    // Обновляем транзакцию с ID платежа
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        paymentId: mockPaymentData.paymentId,
        metadata: mockPaymentData as any,
      },
    });

    return {
      transaction,
      payment: mockPaymentData,
    };
  }

  /**
   * Обработка webhook от ЮKassa
   */
  async handleWebhook(payload: any) {
    // TODO: Верификация подписи ЮKassa
    
    const { object } = payload;
    
    if (!object || !object.id) {
      throw new BadRequestException('Invalid webhook payload');
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: { paymentId: object.id },
      include: { order: true },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    // Обновляем статус транзакции
    if (object.status === 'succeeded') {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.SUCCEEDED },
      });

      // Обновляем статус заказа
      await this.ordersService.updateStatus(transaction.orderId, OrderStatus.PAID);

      // Выдаем eSIM
      await this.ordersService.fulfillOrder(transaction.orderId);
    } else if (object.status === 'canceled') {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: TransactionStatus.CANCELLED },
      });

      await this.ordersService.updateStatus(transaction.orderId, OrderStatus.CANCELLED);
    }

    return { received: true };
  }

  /**
   * Получить транзакции пользователя
   */
  async findByUser(userId: string, limit = 50) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        order: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Получить все транзакции (для админки)
   */
  async findAll(filters?: {
    status?: TransactionStatus;
    type?: TransactionType;
    page?: number;
    limit?: number;
  }) {
    const { status, type, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              telegramId: true,
              username: true,
            },
          },
          order: {
            include: {
              product: true,
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
