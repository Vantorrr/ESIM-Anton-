import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { TransactionType, TransactionStatus, OrderStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  
  // Robokassa credentials
  private readonly merchantLogin: string;
  private readonly password1: string;
  private readonly password2: string;
  private readonly isTest: boolean;
  private readonly robokassaUrl = 'https://auth.robokassa.ru/Merchant/Index.aspx';

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
    private configService: ConfigService,
  ) {
    this.merchantLogin = this.configService.get('ROBOKASSA_MERCHANT_LOGIN') || '';
    this.password1 = this.configService.get('ROBOKASSA_PASSWORD1') || '';
    this.password2 = this.configService.get('ROBOKASSA_PASSWORD2') || '';
    this.isTest = this.configService.get('ROBOKASSA_TEST_MODE') === 'true';
    
    if (this.merchantLogin) {
      this.logger.log(`✅ Robokassa инициализирована (Merchant: ${this.merchantLogin}, Test: ${this.isTest})`);
    } else {
      this.logger.warn('⚠️ Robokassa не настроена - отсутствуют credentials');
    }
  }

  /**
   * Генерация MD5 подписи для Robokassa
   */
  private generateSignature(...parts: (string | number)[]): string {
    const str = parts.join(':');
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * Создать платеж через Robokassa
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
        paymentProvider: 'robokassa',
      },
    });

    // Формируем данные для Robokassa
    const outSum = Number(order.totalAmount).toFixed(2);
    const invId = transaction.id.replace(/\D/g, '').slice(0, 15) || Date.now().toString(); // Только цифры, макс 15 символов
    const description = `eSIM заказ #${order.id.slice(-8)}`;
    
    // Подпись: MerchantLogin:OutSum:InvId:Password1
    const signature = this.generateSignature(
      this.merchantLogin,
      outSum,
      invId,
      this.password1
    );

    // Формируем URL для редиректа на Robokassa
    const params = new URLSearchParams({
      MerchantLogin: this.merchantLogin,
      OutSum: outSum,
      InvId: invId,
      Description: description,
      SignatureValue: signature,
      Culture: 'ru',
      Encoding: 'utf-8',
    });

    if (this.isTest) {
      params.append('IsTest', '1');
    }

    const paymentUrl = `${this.robokassaUrl}?${params.toString()}`;

    // Обновляем транзакцию с данными платежа
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        paymentId: invId,
        metadata: {
          invId,
          outSum,
          paymentUrl,
          orderId: order.id,
        } as any,
      },
    });

    this.logger.log(`💳 Создан платеж Robokassa: InvId=${invId}, Sum=${outSum}₽, Order=${order.id}`);

    return {
      transaction,
      payment: {
        paymentId: invId,
        paymentUrl,
        amount: Number(outSum),
        currency: 'RUB',
      },
    };
  }

  /**
   * Обработка webhook (ResultURL) от Robokassa
   * Robokassa отправляет: OutSum, InvId, SignatureValue
   * Подпись проверяется: MD5(OutSum:InvId:Password2)
   */
  async handleWebhook(payload: any) {
    this.logger.log(`📨 Robokassa webhook: ${JSON.stringify(payload)}`);
    
    const { OutSum, InvId, SignatureValue } = payload;
    
    if (!OutSum || !InvId || !SignatureValue) {
      this.logger.error('❌ Неполные данные webhook');
      throw new BadRequestException('Missing required parameters');
    }

    // Проверяем подпись: MD5(OutSum:InvId:Password2)
    const expectedSignature = this.generateSignature(OutSum, InvId, this.password2);
    
    if (SignatureValue.toLowerCase() !== expectedSignature.toLowerCase()) {
      this.logger.error(`❌ Неверная подпись! Expected: ${expectedSignature}, Got: ${SignatureValue}`);
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`✅ Подпись верна для InvId=${InvId}`);

    // Находим транзакцию по InvId (paymentId)
    const transaction = await this.prisma.transaction.findFirst({
      where: { paymentId: InvId },
      include: { order: true },
    });

    if (!transaction) {
      this.logger.error(`❌ Транзакция не найдена: InvId=${InvId}`);
      throw new BadRequestException('Transaction not found');
    }

    // Проверяем сумму
    if (Number(OutSum).toFixed(2) !== Number(transaction.amount).toFixed(2)) {
      this.logger.error(`❌ Сумма не совпадает! Expected: ${transaction.amount}, Got: ${OutSum}`);
      throw new BadRequestException('Amount mismatch');
    }

    // Обновляем статус транзакции
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: TransactionStatus.SUCCEEDED },
    });

    // Обновляем статус заказа
    await this.ordersService.updateStatus(transaction.orderId, OrderStatus.PAID);

    this.logger.log(`✅ Платеж подтверждён: InvId=${InvId}, Order=${transaction.orderId}`);

    // Выдаем eSIM
    try {
      await this.ordersService.fulfillOrder(transaction.orderId);
      this.logger.log(`✅ eSIM выдан для заказа ${transaction.orderId}`);
    } catch (error) {
      this.logger.error(`❌ Ошибка выдачи eSIM: ${error.message}`);
    }

    // Robokassa ожидает ответ "OK" + InvId
    return `OK${InvId}`;
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
