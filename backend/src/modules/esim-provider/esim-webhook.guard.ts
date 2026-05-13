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
 *   signature = HMAC-SHA256(signData, SecretKey)  → hex lowercase
 *
 * Провайдер шлёт 3 заголовка:
 *   RT-Signature  — hex HMAC-SHA256
 *   RT-Timestamp  — ms timestamp
 *   RT-RequestID  — UUID v4
 *
 * RT-AccessCode НЕ приходит в заголовках webhook — используем из env.
 *
 * ВАЖНО: для корректной работы контроллер должен получать rawBody.
 * В NestJS это настраивается через `rawBody: true` в NestFactory.create().
 */
@Injectable()
export class EsimWebhookGuard implements CanActivate {
  private readonly logger = new Logger(EsimWebhookGuard.name);
  private readonly secretKey: string;
  private readonly accessCode: string;

  constructor(private config: ConfigService) {
    this.secretKey = this.config.get('ESIMACCESS_SECRET_KEY') || '';
    this.accessCode = this.config.get('ESIMACCESS_ACCESS_CODE') || '';
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

    this.logger.log(
      `Webhook headers: signature=${signature ? 'present(' + signature.length + ')' : 'MISSING'}, ` +
      `timestamp=${timestamp ?? 'MISSING'}, requestId=${requestId ?? 'MISSING'}`,
    );

    if (!signature || !timestamp || !requestId) {
      // Без RT-* заголовков пропускаем ТОЛЬКО валидационный CHECK_HEALTH от провайдера.
      // Все прочие запросы без подписи — отклоняем.
      const body = request.body as Record<string, unknown>;
      if (body?.notifyType === 'CHECK_HEALTH') {
        this.logger.log('Webhook: CHECK_HEALTH ping (без подписи), пропускаем');
        return true;
      }
      this.logger.warn(
        `Webhook: отсутствуют RT-* заголовки, запрос отклонён. ` +
        `notifyType=${(request.body as any)?.notifyType ?? 'unknown'}, ` +
        `headers keys: ${Object.keys(request.headers).join(', ')}`,
      );
      throw new UnauthorizedException('Missing webhook signature headers');
    }

    // Получаем raw body — NestJS с rawBody: true кладёт его в request.rawBody
    const rawBody = (request as any).rawBody?.toString('utf-8')
      ?? JSON.stringify(request.body);

    // Формула: signData = timestamp + requestId + accessCode + rawBody
    // accessCode берём из env, т.к. провайдер НЕ шлёт его в заголовках webhook
    const signData = timestamp + requestId + this.accessCode + rawBody;
    const computed = createHmac('sha256', this.secretKey)
      .update(signData, 'utf-8')
      .digest('hex');

    this.logger.log(
      `Webhook sign check: signData length=${signData.length}, ` +
      `rawBody length=${rawBody.length}, hasRawBody=${!!(request as any).rawBody}, ` +
      `computed=${computed.substring(0, 12)}..., ` +
      `received=${signature.substring(0, 12)}...`,
    );

    // Нормализуем в lowercase для сравнения
    const sigLower = signature.toLowerCase();
    const computedLower = computed.toLowerCase();

    // Constant-time сравнение для защиты от timing-атак
    const sigBuf = Buffer.from(sigLower, 'hex');
    const computedBuf = Buffer.from(computedLower, 'hex');

    if (sigBuf.length !== computedBuf.length || !timingSafeEqual(sigBuf, computedBuf)) {
      this.logger.warn(
        `Webhook: невалидная подпись (requestId=${requestId}). ` +
        `sigBuf.length=${sigBuf.length}, computedBuf.length=${computedBuf.length}`,
      );
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
