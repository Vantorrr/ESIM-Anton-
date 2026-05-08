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
import { EsimStatus } from '../esim-provider/esim-status';
import { ReferralsService } from '../referrals/referrals.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
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
const BONUS_HOLD_TTL_MS = 30 * 60 * 1000;

type BonusSpendAvailability = {
  totalEligible: number;
  cashbackEligible: number;
  referralEligible: number;
  trackedReferral: number;
  trackedCashback: number;
  legacyUntracked: number;
};

type BonusSpendBreakdown = {
  bonusToUse: number;
  spentFromCashback: number;
  spentFromReferral: number;
};

type ResolvedLoyaltyLevel = {
  id: string;
  name: string;
  minSpent: number;
  cashbackPercent: number;
  discount: number;
} | null;

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
    private referralsService: ReferralsService,
    private loyaltyService: LoyaltyService,
  ) {}

  private metadataNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private async getEffectiveLoyaltyLevel(totalSpent: number): Promise<ResolvedLoyaltyLevel> {
    return this.loyaltyService.getEffectiveLevelForSpent(totalSpent);
  }

  private async cleanupExpiredBonusSpendHolds(userId?: string) {
    const cutoff = new Date(Date.now() - BONUS_HOLD_TTL_MS);
    const pendingHolds = await this.prisma.transaction.findMany({
      where: {
        ...(userId ? { userId } : {}),
        type: TransactionType.BONUS_SPENT,
        status: TransactionStatus.PENDING,
      },
      select: {
        id: true,
        orderId: true,
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const staleHolds = pendingHolds.filter((hold) => {
      if (!hold.order) return true;
      if (hold.order.status !== OrderStatus.PENDING) return true;
      return hold.order.createdAt < cutoff;
    });

    if (staleHolds.length === 0) return;

    const staleHoldIds = staleHolds.map((hold) => hold.id);
    const staleOrderIds = staleHolds
      .map((hold) => hold.orderId)
      .filter((orderId): orderId is string => Boolean(orderId));

    await this.prisma.transaction.updateMany({
      where: { id: { in: staleHoldIds } },
      data: {
        status: TransactionStatus.CANCELLED,
        metadata: {
          releaseReason: 'payment_session_expired',
        } as any,
      },
    });

    if (staleOrderIds.length > 0) {
      await this.prisma.transaction.updateMany({
        where: {
          orderId: { in: staleOrderIds },
          type: TransactionType.PAYMENT,
          status: TransactionStatus.PENDING,
        },
        data: {
          status: TransactionStatus.CANCELLED,
          metadata: {
            releaseReason: 'payment_session_expired',
          } as any,
        },
      });

      await this.prisma.order.updateMany({
        where: {
          id: { in: staleOrderIds },
          status: OrderStatus.PENDING,
        },
        data: {
          status: OrderStatus.CANCELLED,
          errorMessage: 'Payment session expired',
        },
      });
    }
  }

  private async getBonusSpendAvailability(
    userId: string,
    currentBonusBalance: number,
  ): Promise<BonusSpendAvailability> {
    await this.cleanupExpiredBonusSpendHolds(userId);

    const [settings, transactions] = await Promise.all([
      this.systemSettingsService.getReferralSettings(),
      this.prisma.transaction.findMany({
        where: {
          userId,
          type: {
            in: [
              TransactionType.REFERRAL_BONUS,
              TransactionType.BONUS_ACCRUAL,
              TransactionType.BONUS_SPENT,
            ],
          },
          status: {
            in: [TransactionStatus.SUCCEEDED, TransactionStatus.PENDING],
          },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          type: true,
          status: true,
          amount: true,
          metadata: true,
        },
      }),
    ]);

    let referralCredits = 0;
    let cashbackCredits = 0;
    let spentReferral = 0;
    let spentCashback = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const metadata = tx.metadata as Record<string, unknown> | null;

      if (
        tx.type === TransactionType.REFERRAL_BONUS &&
        tx.status === TransactionStatus.SUCCEEDED
      ) {
        referralCredits += amount;
        continue;
      }

      if (
        tx.type === TransactionType.BONUS_ACCRUAL &&
        tx.status === TransactionStatus.SUCCEEDED
      ) {
        const restoredToReferral = this.metadataNumber(metadata?.restoredToReferral);
        const restoredToCashback = this.metadataNumber(metadata?.restoredToCashback);

        if (restoredToReferral > 0 || restoredToCashback > 0) {
          referralCredits += restoredToReferral;
          cashbackCredits += restoredToCashback;
        } else {
          cashbackCredits += amount;
        }
        continue;
      }

      if (tx.type === TransactionType.BONUS_SPENT) {
        spentReferral += this.metadataNumber(metadata?.spentFromReferral);
        spentCashback += this.metadataNumber(metadata?.spentFromCashback);
      }
    }

    const trackedReferral = Math.max(0, referralCredits - spentReferral);
    const trackedCashback = Math.max(0, cashbackCredits - spentCashback);
    const legacyUntracked = Math.max(
      0,
      currentBonusBalance - trackedReferral - trackedCashback,
    );
    const cashbackEligible = trackedCashback + legacyUntracked;
    const referralEligible =
      trackedReferral >= Number(settings.minPayout) ? trackedReferral : 0;

    return {
      totalEligible: cashbackEligible + referralEligible,
      cashbackEligible,
      referralEligible,
      trackedReferral,
      trackedCashback,
      legacyUntracked,
    };
  }

  private async computeBonusSpend(
    userId: string,
    currentBonusBalance: number,
    requestedBonuses: number,
    totalAmount: number,
  ): Promise<BonusSpendBreakdown> {
    const availability = await this.getBonusSpendAvailability(userId, currentBonusBalance);
    const bonusToUse = Math.min(
      Math.max(0, requestedBonuses),
      currentBonusBalance,
      totalAmount,
      availability.totalEligible,
    );
    const spentFromCashback = Math.min(bonusToUse, availability.cashbackEligible);
    const spentFromReferral = Math.min(
      availability.referralEligible,
      Math.max(0, bonusToUse - spentFromCashback),
    );

    return {
      bonusToUse,
      spentFromCashback,
      spentFromReferral,
    };
  }

  private async createBonusSpendHold(
    userId: string,
    orderId: string,
    bonusSpend: BonusSpendBreakdown,
  ) {
    if (bonusSpend.bonusToUse <= 0) return;

    await this.prisma.transaction.create({
      data: {
        userId,
        orderId,
        type: TransactionType.BONUS_SPENT,
        status: TransactionStatus.PENDING,
        amount: new Prisma.Decimal(bonusSpend.bonusToUse),
        metadata: {
          source: 'order_bonus_hold',
          spentFromReferral: bonusSpend.spentFromReferral,
          spentFromCashback: bonusSpend.spentFromCashback,
        },
      },
    });
  }

  async finalizeBonusSpendHold(orderId: string) {
    const hold = await this.prisma.transaction.findFirst({
      where: {
        orderId,
        type: TransactionType.BONUS_SPENT,
        status: TransactionStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!hold) return;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: hold.userId },
        data: {
          bonusBalance: { decrement: hold.amount },
        },
      }),
      this.prisma.transaction.update({
        where: { id: hold.id },
        data: {
          status: TransactionStatus.SUCCEEDED,
          metadata: {
            ...((hold.metadata as Record<string, unknown> | null) ?? {}),
            source: 'order_bonus_spend',
          } as any,
        },
      }),
    ]);
  }

  async releaseBonusSpendHold(orderId: string, reason = 'payment_failed') {
    await this.prisma.transaction.updateMany({
      where: {
        orderId,
        type: TransactionType.BONUS_SPENT,
        status: TransactionStatus.PENDING,
      },
      data: {
        status: TransactionStatus.CANCELLED,
        metadata: {
          releaseReason: reason,
        } as any,
      },
    });
  }

  private async restoreBonusSpend(orderId: string, reason: string) {
    const spentTx = await this.prisma.transaction.findFirst({
      where: {
        orderId,
        type: TransactionType.BONUS_SPENT,
        status: TransactionStatus.SUCCEEDED,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!spentTx) return;

    const metadata = (spentTx.metadata as Record<string, unknown> | null) ?? {};
    const restoredToReferral = this.metadataNumber(metadata.spentFromReferral);
    const restoredToCashback = this.metadataNumber(metadata.spentFromCashback);
    const alreadyRestored = await this.prisma.transaction.findFirst({
      where: {
        orderId,
        type: TransactionType.BONUS_ACCRUAL,
        status: TransactionStatus.SUCCEEDED,
        metadata: {
          path: ['source'],
          equals: 'order_bonus_refund',
        },
      },
    });

    if (alreadyRestored) return;

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: spentTx.userId },
        data: {
          bonusBalance: { increment: spentTx.amount },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId: spentTx.userId,
          orderId,
          type: TransactionType.BONUS_ACCRUAL,
          status: TransactionStatus.SUCCEEDED,
          amount: spentTx.amount,
          metadata: {
            source: 'order_bonus_refund',
            reason,
            restoredToReferral,
            restoredToCashback,
          } as any,
        },
      }),
    ]);
  }

  private isBalancePaidOrder(order: any) {
    return order.transactions?.some(
      (tx: any) =>
        tx.type === TransactionType.PAYMENT &&
        tx.status === TransactionStatus.SUCCEEDED &&
        (tx.paymentProvider === 'balance' || tx.paymentMethod === 'balance'),
    );
  }

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
    await this.cleanupExpiredBonusSpendHolds(userId);

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

    const currentLoyaltyLevel = await this.getEffectiveLoyaltyLevel(
      Number(user.totalSpent),
    );

    // Применяем скидку лояльности
    if (currentLoyaltyLevel) {
      discount = (totalAmount * Number(currentLoyaltyLevel.discount)) / 100;
      totalAmount -= discount;
    }

    // Применяем бонусы: referral bonus подчиняется minPayout, cashback — нет.
    const bonusSpend = await this.computeBonusSpend(
      userId,
      Number(user.bonusBalance),
      useBonuses,
      totalAmount,
    );
    const bonusToUse = bonusSpend.bonusToUse;
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

    await this.createBonusSpendHold(userId, order.id, bonusSpend);

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
            referredBy: true,
          },
        },
        transactions: true,
      },
    });
  }

  private async applyPurchaseCompletionEffects(order: any) {
    const currentLoyaltyLevel = await this.getEffectiveLoyaltyLevel(
      Number(order.user.totalSpent),
    );

    if (currentLoyaltyLevel) {
      const cashback =
        (Number(order.totalAmount) * Number(currentLoyaltyLevel.cashbackPercent)) / 100;
      await this.usersService.updateBalance(order.userId, cashback, 'bonusBalance');
      if (cashback > 0) {
        await this.prisma.transaction.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            type: TransactionType.BONUS_ACCRUAL,
            status: TransactionStatus.SUCCEEDED,
            amount: new Prisma.Decimal(cashback),
            metadata: {
              source: 'loyalty_cashback',
              cashbackPercent: Number(currentLoyaltyLevel.cashbackPercent),
            },
          },
        });
      }
    }

    await this.prisma.user.update({
      where: { id: order.userId },
      data: { totalSpent: { increment: order.totalAmount } },
    });

    if (order.user.referredById) {
      try {
        await this.referralsService.awardReferralBonus(
          order.user.referredById,
          Number(order.totalAmount),
          order.id,
        );
      } catch (error: any) {
        this.logger.error(
          `Referral bonus failed for order ${order.id}: ${error.message}`,
        );
      }
    }

    try {
      await this.loyaltyService.updateUserLevel(order.userId);
    } catch (error: any) {
      this.logger.error(
        `Loyalty level recalculation failed for order ${order.id}: ${error.message}`,
      );
    }
  }

  /**
   * Получить заказы пользователя
   */
  async findByUser(userId: string, limit = 50) {
    await this.cleanupExpiredBonusSpendHolds(userId);

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
    if (!order) {
      throw new BadRequestException('Заказ не найден');
    }

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Заказ еще не оплачен');
    }

    await this.finalizeBonusSpendHold(orderId);

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
        // Сохраняем SMDP сразу — он нужен для построения LPA-ссылки активации
        ...(esimData.smdp_address ? { smdpAddress: esimData.smdp_address } : {}),
      });

      try {
        await this.applyPurchaseCompletionEffects(order);
      } catch (error: any) {
        this.logger.error(
          `Post-completion accounting failed for order ${order.id}: ${error.message}`,
        );
      }

      // Отправляем уведомления с деталями eSIM
      const esimDetails = {
        country: order.product.country,
        dataAmount: order.product.dataAmount,
        iccid: esimData.iccid,
        qrCode: esimData.qr_code,
        activationCode: esimData.activation_code,
        smdpAddress: esimData.smdp_address,
        orderId: order.id,
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
      if (!this.isBalancePaidOrder(order)) {
        try {
          await this.restoreBonusSpend(orderId, error.message);
        } catch (restoreError: any) {
          this.logger.error(
            `Bonus rollback failed for order ${order.id}: ${restoreError.message}`,
          );
        }
      }

      // В случае ошибки помечаем заказ как FAILED
      await this.updateStatus(orderId, OrderStatus.FAILED, {
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * Получить usage (расход трафика) и snapshot статуса по заказу.
   *
   * Возвращает не только расход, но и нормализованный статус eSIM, даты
   * активации/истечения, SMDP — всё, что нужно для карточки в /my-esim.
   *
   * Поведение:
   *  - если eSIM ещё не выдана (нет ICCID) → available:false с причиной;
   *  - если в БД есть свежий кэш (lastUsageAt < maxAgeSec назад) — отдаём его сразу
   *    (включая закэшированные esimStatus/expiresAt/activatedAt/smdpAddress);
   *  - иначе запрашиваем snapshot у провайдера, обновляем кэш атомарно;
   *  - при ошибке провайдера, если есть НЕ устаревший (< STALE_CACHE_LIMIT_SEC) кэш —
   *    отдаём его с пометкой `stale=true`, иначе available:false.
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
      return this.buildUnavailableResponse(order, 'eSIM ещё не выдана');
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

    // Метаданные снапшота — стартуем с того, что в кэше
    let esimStatus: string | null = order.esimStatus ?? null;
    let activatedAt: Date | null = order.activatedAt ?? null;
    let expiresAt: Date | null = order.expiresAt ?? null;
    let smdpAddress: string | null = order.smdpAddress ?? null;
    let activationCode: string | null = order.activationCode ?? null;

    if (cachedFresh) {
      return this.buildUsageResponse(order, {
        usedBytes,
        totalBytes,
        updatedAt,
        stale: false,
        esimStatus,
        activatedAt,
        expiresAt,
        smdpAddress,
        activationCode,
      });
    }

    try {
      const snapshot = await this.esimProviderService.getEsimSnapshot(order.iccid);
      const providerRemainingBytes =
        snapshot.remainingBytes !== null
          ? Math.max(0, Math.floor(snapshot.remainingBytes))
          : null;

      if (snapshot.usedBytes !== null) {
        usedBytes = Math.max(0, Math.floor(snapshot.usedBytes));
      }
      if (snapshot.totalBytes !== null) {
        totalBytes = Math.max(0, Math.floor(snapshot.totalBytes));
      }
      if (usedBytes === null && totalBytes !== null && providerRemainingBytes !== null) {
        usedBytes = Math.max(0, totalBytes - providerRemainingBytes);
      }
      if (
        usedBytes === null &&
        totalBytes !== null &&
        (snapshot.status === EsimStatus.NOT_INSTALLED || snapshot.status === EsimStatus.ACTIVE)
      ) {
        usedBytes = 0;
      }
      if (snapshot.activatedAt) activatedAt = snapshot.activatedAt;
      if (snapshot.expiresAt) expiresAt = snapshot.expiresAt;
      if (snapshot.smdpAddress) smdpAddress = snapshot.smdpAddress;
      if (snapshot.activationCode) activationCode = snapshot.activationCode;
      esimStatus = snapshot.status;

      // Кэшируем всё что обновилось — даже если usedBytes нет (для статуса/срока)
      updatedAt = new Date();
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          ...(usedBytes !== null
            ? { lastUsageBytes: BigInt(usedBytes!) }
            : {}),
          ...(snapshot.totalBytes !== null
            ? { lastUsageTotalBytes: BigInt(totalBytes!) }
            : {}),
          lastUsageAt: updatedAt,
          esimStatus: esimStatus,
          ...(snapshot.activatedAt ? { activatedAt: snapshot.activatedAt } : {}),
          ...(snapshot.expiresAt ? { expiresAt: snapshot.expiresAt } : {}),
          ...(snapshot.smdpAddress ? { smdpAddress: snapshot.smdpAddress } : {}),
          ...(snapshot.activationCode && !order.activationCode
            ? { activationCode: snapshot.activationCode }
            : {}),
        },
      });
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
      } else if (esimStatus || expiresAt) {
        // Расхода нет, но статус/срок раньше успели закэшировать — отдаём то что есть
        stale = true;
      } else {
        return this.buildUnavailableResponse(
          order,
          'Провайдер временно недоступен, попробуйте через минуту',
        );
      }
    }

    return this.buildUsageResponse(order, {
      usedBytes,
      totalBytes,
      updatedAt,
      stale,
      esimStatus,
      activatedAt,
      expiresAt,
      smdpAddress,
      activationCode,
    });
  }

  /**
   * Расчёт fallback-срока действия из createdAt + product.validityDays.
   * Используется когда провайдер ещё не отдаёт expiredTime (eSIM не активирована).
   */
  private fallbackExpiresAt(order: { createdAt: Date; product: { validityDays: number } | null }): Date | null {
    if (!order.product?.validityDays) return null;
    return new Date(order.createdAt.getTime() + order.product.validityDays * 86400 * 1000);
  }

  private buildUnavailableResponse(
    order: { createdAt: Date; product: { validityDays: number } | null; esimStatus: string | null; activatedAt: Date | null; expiresAt: Date | null },
    reason: string,
  ) {
    return {
      available: false,
      reason,
      totalBytes: null,
      usedBytes: null,
      remainingBytes: null,
      updatedAt: null,
      stale: false,
      status: order.esimStatus ?? null,
      activatedAt: order.activatedAt ?? null,
      expiresAt: order.expiresAt ?? this.fallbackExpiresAt(order),
      percentTraffic: null,
      percentTime: null,
      validityDaysLeft: null,
    };
  }

  private buildUsageResponse(
    order: { createdAt: Date; product: { validityDays: number } | null },
    snap: {
      usedBytes: number | null;
      totalBytes: number | null;
      updatedAt: Date | null;
      stale: boolean;
      esimStatus: string | null;
      activatedAt: Date | null;
      expiresAt: Date | null;
      smdpAddress: string | null;
      activationCode: string | null;
    },
  ) {
    const { usedBytes, totalBytes, updatedAt, stale, esimStatus, activatedAt, smdpAddress, activationCode } = snap;
    const expiresAt = snap.expiresAt ?? this.fallbackExpiresAt(order);

    const remainingBytes =
      totalBytes !== null && usedBytes !== null
        ? Math.max(0, totalBytes - usedBytes)
        : null;

    const percentTraffic =
      totalBytes !== null && totalBytes > 0 && remainingBytes !== null
        ? Math.min(100, Math.max(0, Math.round((remainingBytes / totalBytes) * 100)))
        : null;

    let percentTime: number | null = null;
    let validityDaysLeft: number | null = null;
    if (expiresAt) {
      const now = Date.now();
      const exp = expiresAt.getTime();
      // Базовая точка для прогресса по времени: момент активации, иначе createdAt заказа
      const start = (activatedAt ?? order.createdAt).getTime();
      const total = Math.max(1, exp - start);
      const consumed = Math.max(0, Math.min(total, now - start));
      percentTime = Math.max(0, 100 - Math.round((consumed / total) * 100));
      const msLeft = exp - now;
      validityDaysLeft = msLeft > 0 ? Math.ceil(msLeft / 86400000) : 0;
    }

    return {
      available: totalBytes !== null && (usedBytes !== null || remainingBytes !== null),
      totalBytes,
      usedBytes,
      remainingBytes,
      updatedAt,
      stale,
      status: esimStatus,
      activatedAt,
      expiresAt,
      percentTraffic,
      percentTime,
      validityDaysLeft,
      smdpAddress,
      activationCode,
      ...(usedBytes === null
        ? { reason: 'Данные о расходе ещё не поступили от провайдера' }
        : {}),
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
   * Купить eSIM с баланса пользователя — атомарное списание + немедленный fulfill.
   *
   * Поток:
   *  1. Считаем итоговую сумму через тот же `create()` (применяя промокод/бонусы/лояльность),
   *     но кладём заказ сразу в PAID и атомарно списываем balance внутри транзакции.
   *  2. Если баланса не хватает — `BadRequestException` с понятным текстом «Не хватает X ₽».
   *  3. После транзакции вызываем `fulfillOrder` (вне tx — внешний API не должен держать локи).
   *  4. Если провайдер отказал — refund (balance += amount) + Order.FAILED.
   *
   * Возвращает выполненный заказ с QR-кодом / ICCID.
   */
  async createWithBalance(
    userId: string,
    productId: string,
    opts?: {
      quantity?: number;
      useBonuses?: number;
      periodNum?: number;
      promoCode?: string;
    },
  ) {
    const quantity = opts?.quantity ?? 1;
    const useBonuses = opts?.useBonuses ?? 0;

    const [user, product] = await Promise.all([
      this.usersService.findById(userId),
      this.productsService.findById(productId),
    ]);

    if (!product.isActive) {
      throw new BadRequestException('Продукт недоступен');
    }

    const days = product.isUnlimited && opts?.periodNum ? opts.periodNum : 1;
    let totalAmount = Number(product.ourPrice) * quantity * days;
    let discount = 0;
    let promoDiscount = 0;

    if (opts?.promoCode) {
      const discountPercent = await this.promoCodesService.use(opts.promoCode);
      promoDiscount = (totalAmount * discountPercent) / 100;
      totalAmount -= promoDiscount;
    }

    const currentLoyaltyLevel = await this.getEffectiveLoyaltyLevel(
      Number(user.totalSpent),
    );

    if (currentLoyaltyLevel) {
      discount = (totalAmount * Number(currentLoyaltyLevel.discount)) / 100;
      totalAmount -= discount;
    }

    const bonusSpend = await this.computeBonusSpend(
      userId,
      Number(user.bonusBalance),
      useBonuses,
      totalAmount,
    );
    const bonusToUse = bonusSpend.bonusToUse;
    totalAmount -= bonusToUse;
    if (totalAmount < 0) totalAmount = 0;

    const priceRub = Math.round(totalAmount * 100) / 100;

    if (priceRub <= 0) {
      throw new BadRequestException(
        'Заказ бесплатный — используйте обычный POST /orders + /fulfill-free',
      );
    }

    const userBalance = Number(user.balance);
    if (userBalance < priceRub) {
      throw new BadRequestException(
        `Не хватает ${(priceRub - userBalance).toFixed(2)} ₽ на балансе. Пополните и повторите.`,
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const userFresh = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      if (!userFresh || Number(userFresh.balance) < priceRub) {
        throw new BadRequestException('Недостаточно средств на балансе');
      }

      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: new Prisma.Decimal(priceRub) } },
      });

      if (bonusToUse > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { bonusBalance: { decrement: new Prisma.Decimal(bonusToUse) } },
        });
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          productId,
          quantity,
          ...(product.isUnlimited && days > 1 ? { periodNum: days } : {}),
          productPrice: product.ourPrice,
          discount: new Prisma.Decimal(discount),
          promoCode: opts?.promoCode ? opts.promoCode.trim().toUpperCase() : null,
          promoDiscount: new Prisma.Decimal(promoDiscount),
          bonusUsed: new Prisma.Decimal(bonusToUse),
          totalAmount: new Prisma.Decimal(priceRub),
          status: OrderStatus.PAID,
        },
        include: { product: true, user: true },
      });

      await tx.transaction.create({
        data: {
          userId,
          orderId: newOrder.id,
          type: TransactionType.PAYMENT,
          status: TransactionStatus.SUCCEEDED,
          amount: new Prisma.Decimal(priceRub),
          paymentProvider: 'balance',
          paymentMethod: 'balance',
          metadata: { purpose: 'esim_purchase_balance' } as any,
        },
      });

      if (bonusToUse > 0) {
        await tx.transaction.create({
          data: {
            userId,
            orderId: newOrder.id,
            type: TransactionType.BONUS_SPENT,
            status: TransactionStatus.SUCCEEDED,
            amount: new Prisma.Decimal(bonusToUse),
            metadata: {
              source: 'order_bonus_spend',
              spentFromReferral: bonusSpend.spentFromReferral,
              spentFromCashback: bonusSpend.spentFromCashback,
            } as any,
          },
        });
      }

      return newOrder;
    });

    try {
      const fulfilled = await this.fulfillOrder(created.id);
      return { order: fulfilled, paymentMethod: 'balance' as const };
    } catch (error: any) {
      // Откатываем списание при провале провайдера
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { balance: { increment: new Prisma.Decimal(priceRub) } },
        }),
        ...(bonusToUse > 0
          ? [
              this.prisma.user.update({
                where: { id: userId },
                data: { bonusBalance: { increment: new Prisma.Decimal(bonusToUse) } },
              }),
              this.prisma.transaction.create({
                data: {
                  userId,
                  orderId: created.id,
                  type: TransactionType.BONUS_ACCRUAL,
                  status: TransactionStatus.SUCCEEDED,
                  amount: new Prisma.Decimal(bonusToUse),
                  metadata: {
                    source: 'order_bonus_refund',
                    restoredToReferral: bonusSpend.spentFromReferral,
                    restoredToCashback: bonusSpend.spentFromCashback,
                  } as any,
                },
              }),
            ]
          : []),
        this.prisma.transaction.create({
          data: {
            userId,
            orderId: created.id,
            type: TransactionType.REFUND,
            status: TransactionStatus.SUCCEEDED,
            amount: new Prisma.Decimal(priceRub),
            paymentProvider: 'balance',
            metadata: { purpose: 'esim_purchase_refund', reason: error.message } as any,
          },
        }),
        this.prisma.order.update({
          where: { id: created.id },
          data: { status: OrderStatus.FAILED, errorMessage: error.message },
        }),
      ]);
      throw new BadRequestException(
        `Покупка не выполнена: ${error.message}. Деньги возвращены на баланс.`,
      );
    }
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
