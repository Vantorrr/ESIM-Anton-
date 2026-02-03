import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';
import { EsimProviderService } from '../esim-provider/esim-provider.service';
import { OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
    private usersService: UsersService,
    private esimProviderService: EsimProviderService,
  ) {}

  /**
   * Создать заказ
   */
  async create(userId: string, productId: string, quantity = 1, useBonuses = 0) {
    // Получаем пользователя и продукт
    const [user, product] = await Promise.all([
      this.usersService.findById(userId),
      this.productsService.findById(productId),
    ]);

    if (!product.isActive) {
      throw new BadRequestException('Продукт недоступен');
    }

    // Рассчитываем сумму
    let totalAmount = Number(product.ourPrice) * quantity;
    let discount = 0;

    // Применяем скидку лояльности
    if (user.loyaltyLevel) {
      discount = (totalAmount * Number(user.loyaltyLevel.discount)) / 100;
      totalAmount -= discount;
    }

    // Применяем бонусы
    const bonusToUse = Math.min(useBonuses, Number(user.bonusBalance), totalAmount);
    totalAmount -= bonusToUse;

    // Создаем заказ
    const order = await this.prisma.order.create({
      data: {
        userId,
        productId,
        quantity,
        productPrice: product.ourPrice,
        discount: new Prisma.Decimal(discount),
        bonusUsed: new Prisma.Decimal(bonusToUse),
        totalAmount: new Prisma.Decimal(totalAmount),
        status: OrderStatus.PENDING,
      },
      include: {
        product: true,
        user: true,
      },
    });

    // Списываем бонусы
    if (bonusToUse > 0) {
      await this.usersService.updateBalance(userId, -bonusToUse, 'bonusBalance');
    }

    return order;
  }

  /**
   * Получить заказ по ID
   */
  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        product: true,
        user: {
          include: {
            loyaltyLevel: true,
          },
        },
        transactions: true,
      },
    });
  }

  /**
   * Получить заказы пользователя
   */
  async findByUser(userId: string, limit = 50) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        product: true,
      },
    });
  }

  /**
   * Проверить новые оплаченные заказы (за последние 10 минут)
   */
  async checkNewOrders(userId: string) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const newOrders = await this.prisma.order.findMany({
      where: {
        userId,
        status: {
          in: [OrderStatus.PAID, OrderStatus.COMPLETED],
        },
        createdAt: {
          gte: tenMinutesAgo,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
      include: {
        product: true,
      },
    });

    return {
      hasNewOrders: newOrders.length > 0,
      latestOrder: newOrders[0] || null,
    };
  }

  /**
   * Обновить статус заказа
   */
  async updateStatus(orderId: string, status: OrderStatus, data?: Partial<Prisma.OrderUpdateInput>) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === OrderStatus.COMPLETED && { completedAt: new Date() }),
        ...data,
      },
    });
  }

  /**
   * Выдать eSIM (вызывается после успешной оплаты)
   */
  async fulfillOrder(orderId: string) {
    const order = await this.findById(orderId);

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Заказ еще не оплачен');
    }

    try {
      // TODO: После получения тестового доступа от провайдера раскомментировать:
      // 
      // const esimData = await this.esimProviderService.purchaseEsim(
      //   order.product.providerId,
      //   order.user.email
      // );
      //
      // const updatedOrder = await this.updateStatus(orderId, OrderStatus.COMPLETED, {
      //   qrCode: esimData.qr_code,
      //   iccid: esimData.iccid,
      //   activationCode: esimData.activation_code,
      //   providerOrderId: esimData.order_id,
      //   providerResponse: esimData as any,
      // });

      // Временная заглушка (пока нет доступа к API или для тестов)
      // Генерируем QR-код через API для красивого отображения
      const mockLpaString = 'LPA:1$rsp.truphone.com$TEST-ACTIVATION-CODE';
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mockLpaString)}`;

      const mockEsimData = {
        qrCode: qrCodeUrl, // Ссылка на реальный QR-код
        iccid: '89000000000000000000', // Тестовый ICCID
        activationCode: mockLpaString,
        providerOrderId: `TEST_${Date.now()}`,
      };

      // Обновляем заказ
      const updatedOrder = await this.updateStatus(orderId, OrderStatus.COMPLETED, {
        qrCode: mockEsimData.qrCode,
        iccid: mockEsimData.iccid,
        activationCode: mockEsimData.activationCode,
        providerOrderId: mockEsimData.providerOrderId,
        providerResponse: mockEsimData as any,
      });

      // Начисляем кэшбэк
      if (order.user.loyaltyLevel) {
        const cashback = (Number(order.totalAmount) * Number(order.user.loyaltyLevel.cashbackPercent)) / 100;
        await this.usersService.updateBalance(order.userId, cashback, 'bonusBalance');
      }

      // Обновляем totalSpent для лояльности
      await this.prisma.user.update({
        where: { id: order.userId },
        data: {
          totalSpent: {
            increment: order.totalAmount,
          },
        },
      });

      return updatedOrder;
    } catch (error) {
      // В случае ошибки помечаем заказ как FAILED
      await this.updateStatus(orderId, OrderStatus.FAILED, {
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Получить все заказы (для админки)
   */
  async findAll(filters?: {
    status?: OrderStatus;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: true,
          user: {
            select: {
              id: true,
              telegramId: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
