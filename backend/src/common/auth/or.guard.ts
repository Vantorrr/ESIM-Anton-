import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Type,
  UnauthorizedException,
  mixin,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

type GuardType = Type<CanActivate>;

export function OrGuard(...guards: GuardType[]): Type<CanActivate> {
  @Injectable()
  class OrGuardMixin implements CanActivate {
    constructor(private readonly moduleRef: ModuleRef) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
      let lastError: unknown = null;

      for (const guardType of guards) {
        const guard = this.moduleRef.get(guardType, { strict: false });
        if (!guard) continue;

        try {
          const result = await Promise.resolve(guard.canActivate(context));
          if (result) return true;
        } catch (error) {
          lastError = error;
        }
      }

      if (lastError) {
        throw lastError;
      }

      throw new UnauthorizedException('Unauthorized');
    }
  }

  return mixin(OrGuardMixin);
}
