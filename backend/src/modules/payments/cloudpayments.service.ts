import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';
import { PushService } from '../notifications/push.service';
import { TransactionType, TransactionStatus, OrderStatus } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Покrytie payload-а CloudPayments-вебхука. Сюда попадает то, что присылает
 * касса в `application/x-www-form-urlencoded` (NestJS уже распарсил в объект).
 *
 * `Data` — это произвольная JSON-строка, которую мы отдали в виджет под ключом
 * `data` (см. фронт). Используем её, чтобы понять «куда» зачислять платёж:
 * `purpose: 'esim_topup' | 'esim_order' | 'balance_topup'`.
 */
type CpWebhookBody = Record<string, any>;

interface CpData {
  purpose?: 'esim_order' | 'esim_topup' | 'balance_topup';
  parentOrderId?: string;
  [k: string]: any;
}

/**
 * Сервис обработки вебхуков CloudPayments. Покрывает три кейса:
 *  - оплата нового заказа eSIM (`purpose: 'esim_order'` или без поля — backward-compat);
 *  - оплата top-up существующей eSIM (`purpose: 'esim_topup'`);
 *  - пополнение баланса пользователя (`purpose: 'balance_topup'`).
 *
 * Идемпотентность: каждый callback проверяется по уникальному `TransactionId`
 * (CloudPayments гарантирует уникальность). Повторные `pay` для того же
 * `TransactionId` уже не зачислят баланс или не запустят выдачу повторно.
 *
 * Безопасность: в проде обязательна проверка HMAC-SHA256 от raw body (см.
 * `verifyHmac`). Без секрета или при невалидной подписи возвращаем `code:13`.
 */
@Injectable()
export class CloudPaymentsService {
  private readonly logger = new Logger(CloudPaymentsService.name);
  private readonly publicId: string;
  private readonly apiSecret: string;
  private readonly enforceHmac: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private ordersService: OrdersService,
    private telegramNotification: TelegramNotificationService,
    private pushService: PushService,
  ) {
    this.publicId = this.configService.get('CLOUDPAYMENTS_PUBLIC_ID') || '';
    this.apiSecret = this.configService.get('CLOUDPAYMENTS_API_SECRET') || '';
    // По умолчанию HMAC обязателен в проде; в dev можно отключить флагом
    this.enforceHmac =
      (this.configService.get('CLOUDPAYMENTS_ENFORCE_HMAC') ?? 'true') !== 'false';

    if (this.publicId && this.apiSecret) {
      this.logger.log('✅ CloudPayments initialized');
    } else {
      this.logger.warn('⚠️ CloudPayments credentials missing');
    }
  }

  /**
   * Проверка HMAC-SHA256 от raw тела запроса.
   *
   * CloudPayments кладёт base64-подпись в заголовок `Content-HMAC` (или
   * `X-Content-HMAC`). Считается как `HMAC-SHA256(rawBody, apiSecret)`.
   * См. https://developers.cloudpayments.ru/#proverka-uvedomleniy
   *
   * Если секрет пустой или подпись пустая — поведение зависит от
   * `enforceHmac`. В проде должно быть `true`, в локальной разработке можно
   * выключить через `CLOUDPAYMENTS_ENFORCE_HMAC=false`.
   */
  verifyHmac(rawBody: Buffer | string | undefined, signature: string | undefined): boolean {
    if (!this.apiSecret) {
      this.logger.warn('CloudPayments apiSecret пуст — пропуск HMAC-проверки');
      return !this.enforceHmac;
    }
    if (!signature) {
      this.logger.warn('CloudPayments: не передан Content-HMAC заголовок');
      return !this.enforceHmac;
    }
    if (!rawBody) {
      this.logger.warn('CloudPayments: rawBody недоступен');
      return !this.enforceHmac;
    }

    const expected = crypto
      .createHmac('sha256', this.apiSecret)
      .update(rawBody)
      .digest('base64');

    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(signature);
      // timingSafeEqual бросит, если длины разные — обернём
      if (a.length !== b.length) {
        this.logger.warn('CloudPayments HMAC: длины не совпали');
        return false;
      }
      return crypto.timingSafeEqual(a, b);
    } catch (e: any) {
      this.logger.warn(`CloudPayments HMAC compare error: ${e.message}`);
      return false;
    }
  }

  /**
   * Из `body.Data` (JSON-строка) парсим типизированный payload, который
   * фронт передал в виджет CloudPayments.
   */
  private parseData(body: CpWebhookBody): CpData {
    const raw = body?.Data;
    if (!raw) return {};
    if (typeof raw === 'object') return raw as CpData;
    try {
      return JSON.parse(String(raw)) as CpData;
    } catch {
      this.logger.warn(`CloudPayments: не смог распарсить Data: ${String(raw).slice(0, 200)}`);
      return {};
    }
  }

  // ─────────────────────────────────────────────
  //  CHECK
  // ─────────────────────────────────────────────

  async handleCheck(body: CpWebhookBody) {
    this.logger.log(`🔍 CP Check: invoice=${body?.InvoiceId} amount=${body?.Amount} tx=${body?.TransactionId}`);

    const data = this.parseData(body);

    if (data.purpose === 'balance_topup') {
      return this.checkBalanceTopup(body);
    }

    return this.checkOrder(body);
  }

  private async checkOrder(body: CpWebhookBody) {
    const { InvoiceId, Amount } = body;
    const order = await this.prisma.order.findUnique({ where: { id: String(InvoiceId) } });

    if (!order) {
      this.logger.error(`Order not found: ${InvoiceId}`);
      return { code: 10 };
    }
    if (Number(order.totalAmount) !== Number(Amount)) {
      this.logger.error(`Amount mismatch: order=${order.totalAmount} pay=${Amount}`);
      return { code: 11 };
    }
    if (order.status !== OrderStatus.PENDING) {
      this.logger.warn(`Order not pending (${order.status}) — повторный check, ок`);
      // Не блокируем — повторный check может быть обычным ретраем CloudPayments
      return { code: 0 };
    }

    return { code: 0 };
  }

  private async checkBalanceTopup(body: CpWebhookBody) {
    const { InvoiceId, Amount, AccountId } = body;
    const tx = await this.prisma.transaction.findUnique({ where: { id: String(InvoiceId) } });

    if (!tx) {
      this.logger.error(`balance_topup transaction not found: ${InvoiceId}`);
      return { code: 10 };
    }
    if (tx.paymentMethod !== 'balance_topup' || tx.paymentProvider !== 'cloudpayments') {
      this.logger.error(`balance_topup transaction wrong type: ${tx.paymentMethod}/${tx.paymentProvider}`);
      return { code: 10 };
    }
    if (Number(tx.amount) !== Number(Amount)) {
      this.logger.error(`balance_topup amount mismatch: tx=${tx.amount} pay=${Amount}`);
      return { code: 11 };
    }
    if (AccountId && String(tx.userId) !== String(AccountId)) {
      this.logger.error(`balance_topup user mismatch: tx.user=${tx.userId} pay.account=${AccountId}`);
      return { code: 11 };
    }
    if (tx.status !== TransactionStatus.PENDING) {
      this.logger.warn(`balance_topup tx not pending (${tx.status}) — повторный check, ок`);
      return { code: 0 };
    }
    return { code: 0 };
  }

  // ─────────────────────────────────────────────
  //  PAY
  // ─────────────────────────────────────────────

  async handlePay(body: CpWebhookBody) {
    this.logger.log(`💰 CP Pay: invoice=${body?.InvoiceId} amount=${body?.Amount} tx=${body?.TransactionId}`);

    const data = this.parseData(body);

    if (data.purpose === 'balance_topup') {
      return this.payBalanceTopup(body);
    }

    return this.payOrder(body);
  }

  private async payOrder(body: CpWebhookBody) {
    const { InvoiceId, Amount, TransactionId } = body;
    const cpTxId = String(TransactionId ?? '');

    const order = await this.prisma.order.findUnique({
      where: { id: String(InvoiceId) },
      include: { product: true, user: true },
    });
    if (!order) return { code: 10 };
    if (Number(order.totalAmount) !== Number(Amount)) return { code: 11 };

    // Идемпотентность: если уже есть SUCCEEDED-транзакция с этим TransactionId — выходим
    if (cpTxId) {
      const dup = await this.prisma.transaction.findFirst({
        where: {
          paymentProvider: 'cloudpayments',
          paymentId: cpTxId,
          status: TransactionStatus.SUCCEEDED,
        },
      });
      if (dup) {
        this.logger.warn(`Дубль pay-callback CP TransactionId=${cpTxId} — игнорируем`);
        return { code: 0 };
      }
    }

    // Одной транзакцией: апсертим Transaction(SUCCEEDED) + переводим Order в PAID
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { orderId: order.id, paymentProvider: 'cloudpayments' },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        await tx.transaction.update({
          where: { id: existing.id },
          data: {
            status: TransactionStatus.SUCCEEDED,
            paymentId: cpTxId,
            metadata: body,
          },
        });
      } else {
        await tx.transaction.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            type: TransactionType.PAYMENT,
            status: TransactionStatus.SUCCEEDED,
            amount: order.totalAmount,
            paymentProvider: 'cloudpayments',
            paymentId: cpTxId,
            metadata: body,
          },
        });
      }

      if (order.status === OrderStatus.PENDING) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PAID },
        });
      }
    });

    // Выдача eSIM — вне транзакции, чтобы долгий запрос к провайдеру не лочил БД
    if (order.status === OrderStatus.PENDING) {
      try {
        await this.ordersService.fulfillOrder(order.id);
        this.logger.log(`✅ eSIM issued for order ${order.id}`);
      } catch (e: any) {
        this.logger.error(`❌ Failed to issue eSIM for order ${order.id}: ${e.message}`);
      }

      try {
        await this.pushService.sendPaymentSuccess(order.userId, {
          orderId: order.id,
          productName: order.product.name,
          country: order.product.country,
          dataAmount: order.product.dataAmount,
          price: Number(order.totalAmount),
        });
      } catch (e: any) {
        this.logger.error(`Push notification error: ${e.message}`);
      }
    }

    return { code: 0 };
  }

  private async payBalanceTopup(body: CpWebhookBody) {
    const { InvoiceId, Amount, TransactionId } = body;
    const cpTxId = String(TransactionId ?? '');

    const tx = await this.prisma.transaction.findUnique({
      where: { id: String(InvoiceId) },
      include: { user: true },
    });
    if (!tx) return { code: 10 };
    if (tx.paymentMethod !== 'balance_topup' || tx.paymentProvider !== 'cloudpayments') {
      return { code: 10 };
    }
    if (Number(tx.amount) !== Number(Amount)) return { code: 11 };

    // Идемпотентность: если уже SUCCEEDED — выходим
    if (tx.status === TransactionStatus.SUCCEEDED) {
      this.logger.warn(`balance_topup tx ${tx.id} уже SUCCEEDED — игнорируем дубль pay`);
      return { code: 0 };
    }

    // Дополнительный guard по cpTxId, на случай гонки
    if (cpTxId) {
      const dup = await this.prisma.transaction.findFirst({
        where: {
          id: { not: tx.id },
          paymentProvider: 'cloudpayments',
          paymentId: cpTxId,
          status: TransactionStatus.SUCCEEDED,
        },
      });
      if (dup) {
        this.logger.warn(`balance_topup: дубль CP TransactionId=${cpTxId}`);
        return { code: 0 };
      }
    }

    await this.prisma.$transaction(async (db) => {
      // Атомарный апдейт через WHERE-условие на статус — двойной чек,
      // если параллельный pay уже отработал, count будет 0 и мы не зачислим деньги
      const updated = await db.transaction.updateMany({
        where: { id: tx.id, status: TransactionStatus.PENDING },
        data: {
          status: TransactionStatus.SUCCEEDED,
          paymentId: cpTxId,
          metadata: body,
        },
      });

      if (updated.count === 0) {
        this.logger.warn(`balance_topup tx ${tx.id} уже не в PENDING (гонка) — баланс не трогаем`);
        return;
      }

      await db.user.update({
        where: { id: tx.userId },
        data: { balance: { increment: tx.amount } },
      });
    });

    // Уведомления — вне транзакции
    if (tx.user?.telegramId) {
      try {
        await this.telegramNotification.sendTextNotification(
          tx.user.telegramId,
          `💰 <b>Баланс пополнен на ${Number(tx.amount).toFixed(2)} ₽</b>\n\nСпасибо! Можно покупать eSIM с баланса.`,
          { parseMode: 'HTML' },
        );
      } catch (e: any) {
        this.logger.error(`TG balance_topup notify failed: ${e.message}`);
      }
    }

    return { code: 0 };
  }

  // ─────────────────────────────────────────────
  //  FAIL
  // ─────────────────────────────────────────────

  async handleFail(body: CpWebhookBody) {
    this.logger.warn(`❌ CP Fail: invoice=${body?.InvoiceId} reason=${body?.ReasonCode}`);
    const { InvoiceId } = body;
    if (!InvoiceId) return { code: 0 };

    const data = this.parseData(body);

    if (data.purpose === 'balance_topup') {
      // Failed balance_topup — помечаем транзакцию как FAILED
      await this.prisma.transaction.updateMany({
        where: {
          id: String(InvoiceId),
          paymentMethod: 'balance_topup',
          paymentProvider: 'cloudpayments',
          status: TransactionStatus.PENDING,
        },
        data: { status: TransactionStatus.FAILED, metadata: body },
      });
      return { code: 0 };
    }

    // Order-флоу
    const tx = await this.prisma.transaction.findFirst({
      where: {
        orderId: String(InvoiceId),
        paymentProvider: 'cloudpayments',
        status: TransactionStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (tx) {
      await this.prisma.transaction.update({
        where: { id: tx.id },
        data: { status: TransactionStatus.FAILED, metadata: body },
      });
    }
    await this.ordersService.releaseBonusSpendHold(String(InvoiceId), 'cloudpayments_failed');
    return { code: 0 };
  }
}
