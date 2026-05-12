import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';

/**
 * Guard для верификации webhook от eSIM Access.
 *
 * eSIM Access подписывает каждый webhook HMAC-SHA256:
 *   signData = RT-Timestamp + RT-RequestID + RT-AccessCode + rawBody
 *   signature = HMAC-SHA256(signData, SecretKey)  → hex
 *
 * Заголовки:
 *   RT-Signature  — hex HMAC-SHA256
 *   RT-Timestamp  — ms timestamp
 *   RT-RequestID  — UUID v4
 *   RT-AccessCode — наш Access Code
 *
 * ВАЖНО: для корректной работы контроллер должен получать rawBody.
 * В NestJS это настраивается через `rawBody: true` в NestFactory.create().
 */
@Injectable()
export class EsimWebhookGuard implements CanActivate {
  private readonly logger = new Logger(EsimWebhookGuard.name);
  private readonly secretKey: string;

  constructor(private config: ConfigService) {
    this.secretKey = this.config.get('ESIMACCESS_SECRET_KEY') || '';
    if (!this.secretKey) {
      this.logger.warn('⚠️ ESIMACCESS_SECRET_KEY не задан — webhook подпись не будет проверяться!');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    // Если секрет не настроен — пропускаем (dev-среда)
    if (!this.secretKey) {
      this.logger.warn('Webhook guard: секрет не задан, пропускаем верификацию');
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const signature = this.getHeader(request, 'rt-signature');
    const timestamp = this.getHeader(request, 'rt-timestamp');
    const requestId = this.getHeader(request, 'rt-requestid');
    const accessCode = this.getHeader(request, 'rt-accesscode');

    if (!signature || !timestamp || !requestId || !accessCode) {
      // Без RT-* заголовков пропускаем ТОЛЬКО валидационный CHECK_HEALTH от провайдера.
      // Все прочие запросы без подписи — отклоняем.
      const body = request.body as Record<string, unknown>;
      if (body?.notifyType === 'CHECK_HEALTH') {
        this.logger.log('Webhook: CHECK_HEALTH ping (без подписи), пропускаем');
        return true;
      }
      this.logger.warn('Webhook: отсутствуют RT-* заголовки, запрос отклонён');
      throw new UnauthorizedException('Missing webhook signature headers');
    }

    // Получаем raw body — NestJS с rawBody: true кладёт его в request.rawBody
    const rawBody = (request as any).rawBody?.toString('utf-8')
      ?? JSON.stringify(request.body);

    const signData = timestamp + requestId + accessCode + rawBody;
    const computed = createHmac('sha256', this.secretKey)
      .update(signData, 'utf-8')
      .digest('hex');

    // Constant-time сравнение для защиты от timing-атак
    const sigBuf = Buffer.from(signature, 'hex');
    const computedBuf = Buffer.from(computed, 'hex');

    if (sigBuf.length !== computedBuf.length || !timingSafeEqual(sigBuf, computedBuf)) {
      this.logger.warn(`Webhook: невалидная подпись (requestId=${requestId})`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.debug(`Webhook подпись верифицирована (requestId=${requestId})`);
    return true;
  }

  private getHeader(req: Request, name: string): string | undefined {
    const val = req.headers[name];
    return Array.isArray(val) ? val[0] : val;
  }
}
