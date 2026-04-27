import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';
import { EsimProviderService } from '../esim-provider/esim-provider.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import { EmailService } from '../notifications/email.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import {
  OrderStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

/**
 * Сколько секунд жить кэшу usage по умолчанию.
 * Активная eSIM меняет показания не каждый момент — 5 минут это разумный
 * компромисс между отзывчивостью UI и нагрузкой на eSIM Access API.
 */
const DEFAULT_USAGE_CACHE_SEC = 300;
/**
 * Если кэш старше N секунд — даже при ошибке провайдера не показываем его
 * (могут быть сильно устаревшие данные → introduce in error).
 */
const STALE_CACHE_LIMIT_SEC = 24 * 60 * 60;

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
    private systemSettingsService: SystemSettingsService,
  ) {}

  /**
   * Гарантирует, что заказ существует и принадлежит пользователю.
   * Бросает 404 если не найден, 403 если чужой.
   */
  async assertOwnership(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true },
    });
    if (!order) throw new BadRequestException('Заказ не найден');
    if (order.userId !== userId) {
      throw new ForbiddenException('Заказ принадлежит другому пользователю');
    }
    return order;
  }

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
   * Выдать eSIM (вызывается после успешной оплаты).
   *
   * Если у заказа выставлены `parentOrderId` и `topupPackageCode` — это пополнение
   * существующей eSIM, тогда вместо покупки нового профиля делаем top-up
   * к ICCID родительского заказа.
   */
  async fulfillOrder(orderId: string) {
    const order = await this.findById(orderId);

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Заказ еще не оплачен');
    }

    // === Top-up flow ===
    if (order.parentOrderId && order.topupPackageCode) {
      return this.fulfillTopupOrder(order as any);
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
   *
   * Поведение:
   *  - если eSIM ещё не выдана (нет ICCID) → available:false с причиной;
   *  - если в БД есть свежий кэш (lastUsageAt < maxAgeSec назад) — отдаём его сразу;
   *  - иначе запрашиваем у провайдера, кэшируем `lastUsageBytes` и `lastUsageTotalBytes`;
   *  - при ошибке провайдера, если есть НЕ устаревший (< STALE_CACHE_LIMIT_SEC) кэш —
   *    отдаём его с пометкой `stale=true`, иначе available:false.
   *
   * Поля eSIM Access (`/esim/query` → `obj.esimList[0]`):
   *   - `orderUsage` — потрачено (в байтах);
   *   - `totalVolume` — всего (в байтах).
   * Запасные имена (`dataUsed`/`dataTotal`/`usage`/`volume`) оставлены для устойчивости
   * к небольшим расхождениям в версиях API.
   */
  async getOrderUsage(
    orderId: string,
    maxAgeSec = DEFAULT_USAGE_CACHE_SEC,
    force = false,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });

    if (!order) {
      throw new BadRequestException('Заказ не найден');
    }

    if (!order.iccid) {
      return {
        available: false,
        reason: 'eSIM ещё не выдана',
        totalBytes: null,
        usedBytes: null,
        remainingBytes: null,
        updatedAt: null,
        stale: false,
      };
    }

    const now = Date.now();
    const cachedAt = order.lastUsageAt?.getTime() ?? null;
    const cachedFresh =
      !force && cachedAt !== null && now - cachedAt < maxAgeSec * 1000;

    let usedBytes: number | null =
      order.lastUsageBytes !== null && order.lastUsageBytes !== undefined
        ? Number(order.lastUsageBytes)
        : null;
    let totalBytes: number | null =
      order.lastUsageTotalBytes !== null && order.lastUsageTotalBytes !== undefined
        ? Number(order.lastUsageTotalBytes)
        : null;
    let updatedAt: Date | null = order.lastUsageAt;
    let stale = false;

    if (cachedFresh) {
      return this.buildUsageResponse(usedBytes, totalBytes, updatedAt, false);
    }

    try {
      const info = await this.esimProviderService.getEsimInfoByIccid(order.iccid);
      const esim = info?.esimList?.[0] || info?.esim || info;

      const used = Number(esim?.orderUsage ?? esim?.dataUsed ?? esim?.usage ?? NaN);
      const total = Number(
        esim?.totalVolume ?? esim?.dataTotal ?? esim?.volume ?? NaN,
      );

      if (Number.isFinite(used)) usedBytes = Math.max(0, Math.floor(used));
      if (Number.isFinite(total)) totalBytes = Math.max(0, Math.floor(total));

      if (Number.isFinite(used)) {
        updatedAt = new Date();
        await this.prisma.order.update({
          where: { id: orderId },
          data: {
            lastUsageBytes: BigInt(usedBytes!),
            // total пишем только если действительно пришёл, чтобы не затереть кэш на null
            ...(Number.isFinite(total)
              ? { lastUsageTotalBytes: BigInt(totalBytes!) }
              : {}),
            lastUsageAt: updatedAt,
          },
        });
      }
    } catch (error: any) {
      this.logger.warn(
        `Не удалось получить usage по ICCID ${order.iccid}: ${error.message}`,
      );

      // Если есть кэш и он не слишком старый — отдаём его как stale
      if (
        usedBytes !== null &&
        cachedAt !== null &&
        now - cachedAt < STALE_CACHE_LIMIT_SEC * 1000
      ) {
        stale = true;
      } else {
        return {
          available: false,
          reason: 'Провайдер временно недоступен, попробуйте через минуту',
          totalBytes: null,
          usedBytes: null,
          remainingBytes: null,
          updatedAt: null,
          stale: false,
        };
      }
    }

    if (usedBytes === null) {
      return {
        available: false,
        reason: 'Данные о расходе ещё не поступили от провайдера',
        totalBytes: null,
        usedBytes: null,
        remainingBytes: null,
        updatedAt: null,
        stale: false,
      };
    }

    return this.buildUsageResponse(usedBytes, totalBytes, updatedAt, stale);
  }

  private buildUsageResponse(
    usedBytes: number,
    totalBytes: number | null,
    updatedAt: Date | null,
    stale: boolean,
  ) {
    const remainingBytes =
      totalBytes !== null ? Math.max(0, totalBytes - usedBytes) : null;
    return {
      available: true,
      totalBytes,
      usedBytes,
      remainingBytes,
      updatedAt,
      stale,
    };
  }

  /**
   * Список пакетов пополнения для конкретного заказа (по ICCID).
   * Дополнительно конвертирует цену провайдера в RUB по системным настройкам,
   * чтобы фронт не дублировал логику ценообразования.
   */
  async getTopupPackagesForOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new BadRequestException('Заказ не найден');
    if (!order.iccid) {
      throw new BadRequestException('eSIM ещё не выдана — пополнение недоступно');
    }

    const [packages, pricing] = await Promise.all([
      this.esimProviderService.getTopupPackagesByIccid(order.iccid),
      this.systemSettingsService.getPricingSettings(),
    ]);

    return packages
      .filter((p: any) => p.supportTopup !== false)
      .map((p: any) => {
        const priceUsd = Number(p.price) / 10000;
        const priceRub = Math.round(
          priceUsd * (1 + pricing.defaultMarkupPercent / 100) * pricing.exchangeRate,
        );
        return {
          ...p,
          priceUsd,
          priceRub,
        };
      });
  }

  /**
   * Создать заказ-пополнение существующей eSIM.
   *
   * Поток:
   *  1. Проверяем владельца исходного заказа и наличие ICCID.
   *  2. Ищем пакет у провайдера, считаем стоимость в RUB по настройкам ценообразования.
   *  3. Если paymentMethod=balance — атомарно списываем с balance, ставим статус PAID
   *     и сразу запускаем fulfill (вызовет /esim/topup у провайдера).
   *  4. Если paymentMethod=card — создаём заказ в PENDING, фронт продолжит через
   *     обычный платёжный flow `/payments/create`.
   *
   * Возвращает: { order, paymentMethod, fulfillment? } — для balance уже выполненный
   * заказ; для card нужно создать платёж следующим шагом.
   */
  async createTopupOrder(parentOrderId: string, packageCode: string, requesterId: string, paymentMethod: 'balance' | 'card' = 'card') {
    if (!packageCode) {
      throw new BadRequestException('packageCode обязателен');
    }

    const parent = await this.prisma.order.findUnique({
      where: { id: parentOrderId },
      include: { product: true, user: true },
    });

    if (!parent) throw new BadRequestException('Исходный заказ не найден');
    if (parent.userId !== requesterId) {
      throw new ForbiddenException('Заказ принадлежит другому пользователю');
    }
    if (!parent.iccid) {
      throw new BadRequestException('eSIM ещё не выдана — пополнение недоступно');
    }

    // Получаем пакеты топ-апа и валидируем переданный packageCode
    const packages = await this.esimProviderService.getTopupPackagesByIccid(parent.iccid);
    const pkg = packages.find((p: any) => p.packageCode === packageCode);
    if (!pkg) {
      throw new BadRequestException('Пакет пополнения не найден или больше недоступен');
    }
    if (pkg.supportTopup === false) {
      throw new BadRequestException('Этот пакет не поддерживает пополнение');
    }

    // Считаем цену в RUB по тем же правилам, что и для основных тарифов
    const pricing = await this.systemSettingsService.getPricingSettings();
    const priceUsd = Number(pkg.price) / 10000;
    const priceRub = Math.round(
      priceUsd * (1 + pricing.defaultMarkupPercent / 100) * pricing.exchangeRate,
    );

    if (priceRub <= 0) {
      throw new BadRequestException('Не удалось рассчитать стоимость пополнения');
    }

    // === Balance flow: атомарно списываем и оплачиваем ===
    if (paymentMethod === 'balance') {
      const userBalance = Number(parent.user.balance);
      if (userBalance < priceRub) {
        throw new BadRequestException(
          `Недостаточно средств на балансе. Нужно ${priceRub}₽, есть ${userBalance}₽.`,
        );
      }

      const created = await this.prisma.$transaction(async (tx) => {
        // Повторно проверяем баланс ВНУТРИ транзакции, чтобы избежать race condition
        // (две одновременных кнопки «Пополнить» не должны увести баланс в минус).
        const userFresh = await tx.user.findUnique({
          where: { id: requesterId },
          select: { balance: true },
        });
        if (!userFresh || Number(userFresh.balance) < priceRub) {
          throw new BadRequestException('Недостаточно средств на балансе');
        }

        await tx.user.update({
          where: { id: requesterId },
          data: { balance: { decrement: new Prisma.Decimal(priceRub) } },
        });

        const newOrder = await tx.order.create({
          data: {
            userId: requesterId,
            productId: parent.productId,
            quantity: 1,
            productPrice: new Prisma.Decimal(priceRub),
            totalAmount: new Prisma.Decimal(priceRub),
            status: OrderStatus.PAID,
            parentOrderId: parent.id,
            topupPackageCode: packageCode,
          },
          include: { product: true, user: true },
        });

        await tx.transaction.create({
          data: {
            userId: requesterId,
            orderId: newOrder.id,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.SUCCEEDED,
            amount: new Prisma.Decimal(priceRub),
            paymentProvider: 'balance',
            paymentMethod: 'balance',
            metadata: { purpose: 'topup', packageCode, parentOrderId: parent.id } as any,
          },
        });

        return newOrder;
      });

      // fulfill вне транзакции — обращение к внешнему API не должно держать локи
      try {
        const fulfilled = await this.fulfillOrder(created.id);
        return { order: fulfilled, paymentMethod: 'balance' as const };
      } catch (error: any) {
        // Откатываем списание с баланса при провале провайдера
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: requesterId },
            data: { balance: { increment: new Prisma.Decimal(priceRub) } },
          }),
          this.prisma.transaction.create({
            data: {
              userId: requesterId,
              orderId: created.id,
              type: TransactionType.REFUND,
              status: TransactionStatus.SUCCEEDED,
              amount: new Prisma.Decimal(priceRub),
              paymentProvider: 'balance',
              metadata: { purpose: 'topup_refund', reason: error.message } as any,
            },
          }),
          this.prisma.order.update({
            where: { id: created.id },
            data: { status: OrderStatus.FAILED, errorMessage: error.message },
          }),
        ]);
        throw new BadRequestException(
          `Пополнение не выполнено: ${error.message}. Деньги возвращены на баланс.`,
        );
      }
    }

    // === Card flow: создаём заказ в PENDING, фронт продолжит через /payments/create ===
    const newOrder = await this.prisma.order.create({
      data: {
        userId: requesterId,
        productId: parent.productId,
        quantity: 1,
        productPrice: new Prisma.Decimal(priceRub),
        totalAmount: new Prisma.Decimal(priceRub),
        status: OrderStatus.PENDING,
        parentOrderId: parent.id,
        topupPackageCode: packageCode,
      },
      include: { product: true, user: true },
    });

    return { order: newOrder, paymentMethod: 'card' as const };
  }

  /**
   * Внутренний метод: выполнить top-up через провайдера для уже PAID-заказа-пополнения.
   * Не вызывается напрямую из контроллеров; запускается из fulfillOrder.
   */
  private async fulfillTopupOrder(order: any) {
    const parent = await this.prisma.order.findUnique({
      where: { id: order.parentOrderId },
      select: { iccid: true, userId: true },
    });
    if (!parent || !parent.iccid) {
      await this.updateStatus(order.id, OrderStatus.FAILED, {
        errorMessage: 'У родительского заказа нет ICCID',
      });
      throw new BadRequestException('Родительская eSIM не найдена');
    }

    try {
      const result = await this.esimProviderService.topupEsim(
        parent.iccid,
        order.topupPackageCode,
        `topup_${order.id}_${Date.now()}`,
      );

      const updated = await this.updateStatus(order.id, OrderStatus.COMPLETED, {
        providerOrderId: result.orderNo,
        providerResponse: result as any,
        // Сбрасываем кэш usage у родителя — чтобы при следующем запросе мы
        // пошли к провайдеру за свежими цифрами с учётом нового объёма.
      });
      await this.prisma.order.update({
        where: { id: order.parentOrderId },
        data: {
          lastUsageAt: null,
          lastUsageTotalBytes: null,
          lowTrafficNotifiedAt: null,
        },
      });

      // Уведомляем пользователя об успешном пополнении
      const user = await this.prisma.user.findUnique({
        where: { id: order.userId },
        select: { telegramId: true },
      });
      if (user?.telegramId) {
        try {
          await this.telegramNotification.sendTextNotification(
            user.telegramId,
            '✅ <b>Пополнение eSIM выполнено</b>\n\n' +
              'Свежий объём трафика уже доступен. ' +
              'Откройте приложение, чтобы посмотреть остаток.',
            { openMyEsim: true },
          );
        } catch (e: any) {
          this.logger.warn(`Топ-ап уведомление не отправилось: ${e.message}`);
        }
      }

      return updated;
    } catch (error: any) {
      await this.updateStatus(order.id, OrderStatus.FAILED, {
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
