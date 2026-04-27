import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Guard для эндпоинтов клиентского mini-app: требует Bearer JWT,
 * выписанный AuthService (sub = userId, type = 'user').
 *
 * После прохождения guard'а в request кладётся объект `user` с полями {id, ...payload}.
 * Достать его в обработчике: `@CurrentUser() user: AuthUser`.
 */
@Injectable()
export class JwtUserGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('No bearer token');
    }
    const token = header.slice(7);

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Token has no subject');
    }

    req.user = {
      id: payload.sub,
      type: payload.type ?? null,
      role: payload.role ?? null,
      provider: payload.provider ?? null,
    };

    return true;
  }
}

/**
 * Guard для админских эндпоинтов. JWT админа выдаётся в loginAdmin,
 * payload: { sub, email, role: 'SUPER_ADMIN'|'MANAGER'|'SUPPORT' }.
 */
@Injectable()
export class JwtAdminGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('No bearer token');
    }
    const token = header.slice(7);

    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload?.sub || !payload?.role) {
      throw new UnauthorizedException('Not an admin token');
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return true;
  }
}

export type AuthUser = {
  id: string;
  type?: string | null;
  role?: string | null;
  provider?: string | null;
};

/**
 * Достаёт из request `user`, который положил guard.
 *  Использование: `async handler(@CurrentUser() user: AuthUser) { ... }`
 */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
