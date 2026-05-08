import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const rawHeader = req.headers?.['x-telegram-bot-token'];
    const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    const configuredToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!header) {
      throw new UnauthorizedException('Service token required');
    }

    if (!configuredToken || header !== configuredToken) {
      throw new ForbiddenException('Invalid service token');
    }

    req.service = { type: 'telegram-bot' };
    return true;
  }
}
