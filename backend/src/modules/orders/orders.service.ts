import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';
import { EsimProviderService } from '../esim-provider/esim-provider.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import { EmailService } from '../notifications/email.service';
import { OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
    private usersService: UsersService,
    private esimProviderService: EsimProviderService,
    private promoCodesService: PromoCodesService,
    private telegramNotification: TelegramNotificationService,
    private emailService: EmailService,
  ) {}

  /**
   * Создать заказ
   */
  async create(
    userId: string,
    productId: string,
    quantity = 1,
    useBonuses = 0,
    periodNum?: number,
    promoCodeStr?: string,
  ) {
    const [user, product] = await Promise.all([
      this.usersService.findById(userId),
      this.productsService.findById(productId),
    ]);

    if (!product.isActive) {
      throw new BadRequestException('Продукт недоступен');
    }

    const days = product.isUnlimited && periodNum ? periodNum : 1;
    let totalAmount = Number(product.ourPrice) * quantity * days;
    let discount = 0;
    let promoDiscount = 0;

    // Применяем промокод
    if (promoCodeStr) {
      const discountPercent = await this.promoCodesService.use(promoCodeStr);
      promoDiscount = (totalAmount * discountPercent) / 100;
      totalAmount -= promoDiscount;
    }

    // Применяем скидку лояльности
    if (user.loyaltyLevel) {
      discount = (totalAmount * Number(user.loyaltyLevel.discount)) / 100;
      totalAmount -= discount;
    }

    // Применяем бонусы
    const bonusToUse = Math.min(useBonuses, Number(user.bonusBalance), totalAmount);
    totalAmount -= bonusToUse;

    if (totalAmount < 0) totalAmount = 0;

    const order = await this.prisma.order.create({
      data: {
        userId,
        productId,
        quantity,
        ...(product.isUnlimited && days > 1 ? { periodNum: days } : {}),
        productPrice: product.ourPrice,
        discount: new Prisma.Decimal(discount),
        promoCode: promoCodeStr ? promoCodeStr.trim().toUpperCase() : null,
        promoDiscount: new Prisma.Decimal(promoDiscount),
        bonusUsed: new Prisma.Decimal(bonusToUse),
        totalAmount: new Prisma.Decimal(totalAmount),
        status: OrderStatus.PENDING,
      },
      include: {
        product: true,
        user: true,
      },
    });

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
      const esimData = await this.esimProviderService.purchaseEsim(
        order.product.providerId,
        order.user.email,
        order.periodNum ?? undefined,
        Number(order.product.providerPrice) || undefined,
      );

      const updatedOrder = await this.updateStatus(orderId, OrderStatus.COMPLETED, {
        qrCode: esimData.qr_code,
        iccid: esimData.iccid,
        activationCode: esimData.activation_code,
        providerOrderId: esimData.order_id,
        providerResponse: esimData as any,
      });

      // Начисляем кэшбэк
      if (order.user.loyaltyLevel) {
        const cashback = (Number(order.totalAmount) * Number(order.user.loyaltyLevel.cashbackPercent)) / 100;
        await this.usersService.updateBalance(order.userId, cashback, 'bonusBalance');
      }

      // Обновляем totalSpent для лояльности
      await this.prisma.user.update({
        where: { id: order.userId },
        data: { totalSpent: { increment: order.totalAmount } },
      });

      // Отправляем уведомления с деталями eSIM
      const esimDetails = {
        country: order.product.country,
        dataAmount: order.product.dataAmount,
        iccid: esimData.iccid,
        qrCode: esimData.qr_code,
        activationCode: esimData.activation_code,
      };

      // Telegram — отправляем QR + детали
      if (order.user.telegramId) {
        try {
          await this.telegramNotification.sendEsimDetails(order.user.telegramId, esimDetails);
        } catch (e: any) {
          this.logger.error(`TG notification failed: ${e.message}`);
        }
      }

      // Email — отправляем если есть адрес
      if (order.user.email) {
        try {
          await this.emailService.sendEsimReady(order.user.email, {
            orderId: order.id,
            country: order.product.country,
            dataAmount: order.product.dataAmount,
            iccid: esimData.iccid,
            qrCode: esimData.qr_code,
            activationCode: esimData.activation_code,
            price: Number(order.totalAmount),
          });
          this.logger.log(`✅ Email с eSIM отправлен на ${order.user.email}`);
        } catch (e: any) {
          this.logger.error(`Email notification failed: ${e.message}`);
        }
      }

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
   * Получить usage (расход трафика) по заказу.
   * Делает запрос к провайдеру по ICCID, кэширует результат в БД (lastUsageBytes/lastUsageAt),
   * чтобы не дёргать API на каждый рендер.
   *
   * @param orderId      id заказа
   * @param maxAgeSec    если кэш свежее — возвращаем его без запроса к провайдеру (по умолчанию 5 мин)
   * @param force        принудительно перезапросить у провайдера
   */
  async getOrderUsage(orderId: string, maxAgeSec = 300, force = false) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });

    if (!order) {
      throw new BadRequestException('Заказ не найден');
    }

    if (!order.iccid) {
      // eSIM ещё не выдана — usage не имеет смысла
      return {
        available: false,
        reason: 'eSIM ещё не выдана',
        totalBytes: null,
        usedBytes: null,
        remainingBytes: null,
        updatedAt: null,
      };
    }

    const cachedFresh =
      !force &&
      order.lastUsageAt &&
      Date.now() - order.lastUsageAt.getTime() < maxAgeSec * 1000;

    let usedBytes: number | null = order.lastUsageBytes ? Number(order.lastUsageBytes) : null;
    let totalBytes: number | null = null;
    let updatedAt: Date | null = order.lastUsageAt;

    if (!cachedFresh) {
      try {
        const info = await this.esimProviderService.getEsimInfoByIccid(order.iccid);
        const esim = info?.esimList?.[0] || info?.esim || info;

        // У eSIMaccess поля могут называться orderUsage/totalVolume или dataUsed/dataTotal
        const used =
          Number(esim?.orderUsage ?? esim?.dataUsed ?? esim?.usage ?? NaN);
        const total =
          Number(esim?.totalVolume ?? esim?.dataTotal ?? esim?.volume ?? NaN);

        if (Number.isFinite(used)) usedBytes = used;
        if (Number.isFinite(total)) totalBytes = total;

        if (Number.isFinite(used)) {
          updatedAt = new Date();
          await this.prisma.order.update({
            where: { id: orderId },
            data: {
              lastUsageBytes: BigInt(Math.max(0, Math.floor(used))),
              lastUsageAt: updatedAt,
            },
          });
        }
      } catch (error: any) {
        this.logger.warn(
          `Не удалось получить usage по ICCID ${order.iccid}: ${error.message}`,
        );
        // Возвращаем кэш если есть, иначе available=false
        if (usedBytes === null) {
          return {
            available: false,
            reason: 'Провайдер временно недоступен',
            totalBytes: null,
            usedBytes: null,
            remainingBytes: null,
            updatedAt: null,
          };
        }
      }
    }

    if (usedBytes === null) {
      return {
        available: false,
        reason: 'Данные ещё не обновлены',
        totalBytes: null,
        usedBytes: null,
        remainingBytes: null,
        updatedAt: null,
      };
    }

    const remainingBytes =
      totalBytes !== null ? Math.max(0, totalBytes - usedBytes) : null;

    return {
      available: true,
      totalBytes,
      usedBytes,
      remainingBytes,
      updatedAt,
    };
  }

  /**
   * Список пакетов пополнения для конкретного заказа (по ICCID).
   */
  async getTopupPackagesForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new BadRequestException('Заказ не найден');
    if (!order.iccid) {
      throw new BadRequestException('eSIM ещё не выдана — пополнение недоступно');
    }

    return this.esimProviderService.getTopupPackagesByIccid(order.iccid);
  }

  /**
   * Запустить пополнение eSIM выбранным пакетом.
   * Возвращает данные провайдера; биллинг (списание со счёта пользователя или
   * новая оплата) — ответственность вызывающего слоя/платёжного модуля.
   */
  async topupOrder(orderId: string, packageCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new BadRequestException('Заказ не найден');
    if (!order.iccid) {
      throw new BadRequestException('eSIM ещё не выдана — пополнение недоступно');
    }

    const transactionId = `topup_${order.id}_${Date.now()}`;
    return this.esimProviderService.topupEsim(order.iccid, packageCode, transactionId);
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
