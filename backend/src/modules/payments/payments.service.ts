import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import { TransactionType, TransactionStatus, OrderStatus, Prisma } from '@prisma/client';
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
    private telegramNotification: TelegramNotificationService,
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
    const description = `Mojo mobile заказ #${order.id.slice(-8)}`;
    
    // Подпись: MerchantLogin:OutSum:InvId:Password1
    const signature = this.generateSignature(
      this.merchantLogin,
      outSum,
      invId,
      this.password1
    );

    // Формируем название товара для чека
    const productName = order.product 
      ? `${order.product.name} (${order.product.country}, ${order.product.dataAmount})`
      : 'Лицензионное вознаграждение за ПО Mojo mobile';
    
    // Формируем чек для фискализации (Робочеки)
    const receipt = {
      sno: 'usn_income', // Система налогообложения (УСН доход)
      items: [
        {
          name: productName,
          quantity: order.quantity || 1,
          sum: Number(outSum),
          tax: 'none', // Без НДС
          payment_method: 'full_prepayment', // Полная предоплата
          payment_object: 'service', // Услуга
        }
      ]
    };

    // Формируем URL для редиректа на Robokassa
    const params = new URLSearchParams({
      MerchantLogin: this.merchantLogin,
      OutSum: outSum,
      InvId: invId,
      Description: description,
      SignatureValue: signature,
      Culture: 'ru',
      Encoding: 'utf-8',
      Receipt: JSON.stringify(receipt), // Добавляем чек
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

    this.logger.log(`💳 Создан платеж Robokassa: InvId=${invId}, Sum=${outSum}₽, Order=${order.id}, Items: ${receipt.items[0].name}`);

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

  async assertOrderOwnership(orderId: string, userId: string) {
    await this.ordersService.assertOwnership(orderId, userId);
  }

  /**
   * Создать платёж для пополнения личного баланса пользователя через Robokassa.
   *
   * В отличие от `createPayment` (который завязан на конкретный заказ-eSIM),
   * здесь Transaction создаётся БЕЗ orderId, а в metadata кладётся
   * `{ purpose: 'balance_topup', userId, amount }`. После успешного webhook
   * в `handleWebhook` мы атомарно увеличим `user.balance`, ничего не выдавая
   * через провайдера eSIM.
   */
  /**
   * Создать pending-Transaction под пополнение баланса через CloudPayments.
   *
   * Возвращает данные для виджета: `{ invoiceId, amount, publicId, accountId }`.
   * Виджет на клиенте откроется, проведёт оплату, а CloudPayments выстрелит
   * `check`/`pay` вебхуки в `CloudPaymentsService.handle*BalanceTopup`.
   *
   * Robokassa-флоу остаётся доступным через
   * `createBalanceTopupPaymentRobokassa` для совместимости.
   */
  async prepareCloudPaymentsBalanceTopup(userId: string, amount: number) {
    if (!Number.isFinite(amount) || amount < 100) {
      throw new BadRequestException('Минимальная сумма пополнения — 100 ₽');
    }
    if (amount > 100000) {
      throw new BadRequestException('Максимальная сумма пополнения — 100 000 ₽');
    }

    const publicId = process.env.CLOUDPAYMENTS_PUBLIC_ID;
    if (!publicId) {
      throw new BadRequestException('CloudPayments не настроен');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw new BadRequestException('Пользователь не найден');

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        orderId: null,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.PENDING,
        amount: new Prisma.Decimal(amount),
        paymentProvider: 'cloudpayments',
        paymentMethod: 'balance_topup',
        metadata: { purpose: 'balance_topup', userId, amount } as any,
      },
    });

    return {
      provider: 'cloudpayments' as const,
      invoiceId: transaction.id,
      amount: Number(amount),
      currency: 'RUB',
      publicId,
      accountId: userId,
      description: `Пополнение баланса Mojo mobile #${transaction.id.slice(-6)}`,
      data: { purpose: 'balance_topup' as const, userId, amount: Number(amount) },
    };
  }

  /**
   * Старый Robokassa-флоу пополнения баланса.
   * Оставлен на случай, если CloudPayments по какой-то причине упадёт или
   * понадобится альтернативный провайдер (используется через `?provider=robokassa`).
   */
  async createBalanceTopupPayment(userId: string, amount: number) {
    if (!Number.isFinite(amount) || amount < 100) {
      throw new BadRequestException('Минимальная сумма пополнения — 100 ₽');
    }
    if (amount > 100000) {
      throw new BadRequestException('Максимальная сумма пополнения — 100 000 ₽');
    }
    if (!this.merchantLogin) {
      throw new BadRequestException('Платёжный шлюз не настроен');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Пользователь не найден');

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        orderId: null,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.PENDING,
        amount: new Prisma.Decimal(amount),
        paymentProvider: 'robokassa',
        paymentMethod: 'balance_topup',
        metadata: { purpose: 'balance_topup', userId, amount } as any,
      },
    });

    const outSum = Number(amount).toFixed(2);
    const invId = transaction.id.replace(/\D/g, '').slice(0, 15) || Date.now().toString();
    const description = `Пополнение баланса Mojo mobile #${transaction.id.slice(-6)}`;

    const signature = this.generateSignature(
      this.merchantLogin,
      outSum,
      invId,
      this.password1,
    );

    const receipt = {
      sno: 'usn_income',
      items: [
        {
          name: description,
          quantity: 1,
          sum: Number(outSum),
          tax: 'none',
          payment_method: 'full_prepayment',
          payment_object: 'service',
        },
      ],
    };

    const params = new URLSearchParams({
      MerchantLogin: this.merchantLogin,
      OutSum: outSum,
      InvId: invId,
      Description: description,
      SignatureValue: signature,
      Culture: 'ru',
      Encoding: 'utf-8',
      Receipt: JSON.stringify(receipt),
    });
    if (this.isTest) params.append('IsTest', '1');

    const paymentUrl = `${this.robokassaUrl}?${params.toString()}`;

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        paymentId: invId,
        metadata: {
          purpose: 'balance_topup',
          userId,
          amount,
          invId,
          outSum,
          paymentUrl,
        } as any,
      },
    });

    this.logger.log(`💳 Создан balance-topup платёж: InvId=${invId}, Sum=${outSum}₽, User=${userId}`);

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
   * Найти заказ по InvId (для редиректа)
   */
  async findOrderByInvId(invId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { paymentId: invId },
      include: { order: true },
    });
    return transaction?.order;
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

    // Идемпотентность: если транзакция уже обработана (SUCCEEDED) — не делаем ничего повторно.
    // Robokassa может ретраить webhook, мы не должны дважды зачислить баланс или дважды выдать eSIM.
    if (transaction.status === TransactionStatus.SUCCEEDED) {
      this.logger.log(`ℹ️ Webhook повтор для InvId=${InvId}, транзакция уже обработана`);
      return `OK${InvId}`;
    }

    // === Ветка: пополнение личного баланса (без orderId) ===
    const meta = (transaction.metadata as any) || {};
    if (!transaction.orderId && meta.purpose === 'balance_topup') {
      const amount = Number(transaction.amount);
      try {
        await this.prisma.$transaction([
          this.prisma.transaction.update({
            where: { id: transaction.id },
            data: { status: TransactionStatus.SUCCEEDED },
          }),
          this.prisma.user.update({
            where: { id: transaction.userId },
            data: { balance: { increment: new Prisma.Decimal(amount) } },
          }),
        ]);
        this.logger.log(
          `✅ Баланс пользователя ${transaction.userId} пополнен на ${amount}₽ (InvId=${InvId})`,
        );

        // Уведомление в Telegram
        try {
          const u = await this.prisma.user.findUnique({
            where: { id: transaction.userId },
            select: { telegramId: true, balance: true },
          });
          if (u?.telegramId) {
            await this.telegramNotification.sendTextNotification(
              u.telegramId,
              `✅ <b>Баланс пополнен</b>\n\n` +
                `+${amount}₽\nТекущий баланс: <b>${Number(u.balance)}₽</b>`,
              { openMyEsim: false },
            );
          }
        } catch (e: any) {
          this.logger.warn(`Уведомление о пополнении баланса не отправлено: ${e.message}`);
        }
      } catch (error: any) {
        this.logger.error(`❌ Не удалось зачислить balance topup: ${error.message}`);
        throw new BadRequestException('Failed to credit balance');
      }
      return `OK${InvId}`;
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

    // Отправляем уведомление в Telegram
    try {
      const fullOrder = await this.ordersService.findById(transaction.orderId);
      if (fullOrder && fullOrder.user) {
        await this.telegramNotification.sendPaymentSuccessNotification(
          fullOrder.user.telegramId,
          {
            orderId: fullOrder.id,
            productName: fullOrder.product.name,
            country: fullOrder.product.country,
            dataAmount: fullOrder.product.dataAmount,
            price: Number(fullOrder.totalAmount),
          }
        );
        this.logger.log(`✅ Уведомление отправлено в Telegram для ${fullOrder.user.telegramId}`);
      }
    } catch (error) {
      this.logger.error(`❌ Ошибка отправки уведомления: ${error.message}`);
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
