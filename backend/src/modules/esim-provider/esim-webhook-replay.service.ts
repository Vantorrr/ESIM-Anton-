import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EsimWebhookReceiptAuthMode, Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import * as crypto from 'crypto';
import type { EsimWebhookPayload } from './esim-webhook.service';

type ClaimedUnsignedWebhook = {
  receiptId: string;
  dedupKey: string;
};

@Injectable()
export class EsimWebhookReplayService {
  private readonly unsignedMaxAgeMs: number;
  private readonly unsignedFutureSkewMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.unsignedMaxAgeMs =
      Number(this.config.get('ESIM_WEBHOOK_UNSIGNED_MAX_AGE_MS')) || 15 * 60 * 1000;
    this.unsignedFutureSkewMs =
      Number(this.config.get('ESIM_WEBHOOK_UNSIGNED_FUTURE_SKEW_MS')) || 2 * 60 * 1000;
  }

  async claimUnsignedOrderStatus(payload: EsimWebhookPayload): Promise<ClaimedUnsignedWebhook> {
    if (payload.notifyType !== 'ORDER_STATUS') {
      throw new UnauthorizedException('Unsigned webhook type is not allowed');
    }

    const orderNo = String(payload.content?.orderNo ?? '').trim();
    if (!orderNo) {
      throw new UnauthorizedException('Unsigned ORDER_STATUS requires orderNo');
    }

    const eventGeneratedAt = this.parseEventGeneratedAt(payload.eventGenerateTime);
    const dedupKey = this.buildDedupKey(payload);

    try {
      const receipt = await this.prisma.esimWebhookReceipt.create({
        data: {
          dedupKey,
          authMode: EsimWebhookReceiptAuthMode.UNSIGNED_ACCESSCODE,
          notifyType: payload.notifyType,
          notifyId: payload.notifyId ? String(payload.notifyId) : null,
          orderNo,
          eventGeneratedAt,
        },
        select: {
          id: true,
          dedupKey: true,
        },
      });

      return {
        receiptId: receipt.id,
        dedupKey: receipt.dedupKey,
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new UnauthorizedException('Duplicate unsigned webhook replay rejected');
      }

      throw error;
    }
  }

  async confirmReceipt(receiptId: string | undefined) {
    if (!receiptId) return;
    // Receipt stays stored as durable replay barrier.
    await this.prisma.esimWebhookReceipt.update({
      where: { id: receiptId },
      data: {},
    });
  }

  async releaseReceipt(receiptId: string | undefined) {
    if (!receiptId) return;

    await this.prisma.esimWebhookReceipt.deleteMany({
      where: { id: receiptId },
    });
  }

  private parseEventGeneratedAt(value: string | undefined): Date {
    const parsed = value ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
      throw new UnauthorizedException('Unsigned webhook requires valid eventGenerateTime');
    }

    const now = Date.now();
    const eventMs = parsed.getTime();
    if (eventMs < now - this.unsignedMaxAgeMs) {
      throw new UnauthorizedException('Unsigned webhook is too old');
    }
    if (eventMs > now + this.unsignedFutureSkewMs) {
      throw new UnauthorizedException('Unsigned webhook is too far in the future');
    }

    return parsed;
  }

  private buildDedupKey(payload: EsimWebhookPayload) {
    const notifyId = payload.notifyId ? String(payload.notifyId).trim() : '';
    if (notifyId) {
      return `unsigned-order-status:${notifyId}`;
    }

    const orderNo = String(payload.content?.orderNo ?? '').trim();
    const hash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          notifyType: payload.notifyType,
          orderNo,
          orderStatus: payload.content?.orderStatus ?? null,
          eventGenerateTime: payload.eventGenerateTime ?? null,
        }),
        'utf-8',
      )
      .digest('hex');

    return `unsigned-order-status:${orderNo}:${hash}`;
  }
}
