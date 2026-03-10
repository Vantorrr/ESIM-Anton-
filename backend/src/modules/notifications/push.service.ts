import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as webpush from 'web-push';

export interface PushSubscriptionDto {
  endpoint: string;
  p256dh: string;
  auth: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const publicKey = this.configService.get('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get('VAPID_PRIVATE_KEY');
    const subject = this.configService.get('VAPID_SUBJECT') || 'mailto:info@mojomobile.ru';

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.logger.log('✅ Push Service initialized with VAPID keys');
    } else {
      this.logger.warn('⚠️ VAPID keys not set - web push disabled');
    }
  }

  async subscribe(userId: string, sub: PushSubscriptionDto): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: { p256dh: sub.p256dh, auth: sub.auth },
      create: { userId, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
    });
    this.logger.log(`✅ Push subscription saved for user ${userId}`);
  }

  async unsubscribe(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
  }

  async sendToUser(userId: string, payload: object): Promise<void> {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;

    const message = JSON.stringify(payload);
    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message,
        ),
      ),
    );

    let failed = 0;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        failed++;
        const err = result.reason as any;
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await this.prisma.pushSubscription.deleteMany({ where: { endpoint: subs[i].endpoint } });
          this.logger.log(`🗑️ Removed stale subscription ${subs[i].endpoint}`);
        }
      }
    }

    this.logger.log(`📤 Push sent to user ${userId}: ${subs.length - failed}/${subs.length} delivered`);
  }

  async sendPaymentSuccess(userId: string, orderDetails: {
    orderId: string;
    productName: string;
    country: string;
    dataAmount: string;
    price: number;
  }): Promise<void> {
    await this.sendToUser(userId, {
      title: '✅ Оплата прошла успешно!',
      body: `${orderDetails.productName} — ${orderDetails.dataAmount} готов к активации`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: {
        url: '/my-esim',
        orderId: orderDetails.orderId,
      },
      actions: [
        { action: 'open', title: 'Открыть Мои eSIM' },
        { action: 'dismiss', title: 'Закрыть' },
      ],
    });
  }

  getPublicKey(): string {
    return this.configService.get('VAPID_PUBLIC_KEY') || '';
  }
}
