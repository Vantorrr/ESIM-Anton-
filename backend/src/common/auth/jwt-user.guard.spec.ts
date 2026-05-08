import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAdminGuard, JwtUserGuard } from './jwt-user.guard';

function createContext(headers: Record<string, string> = {}): ExecutionContext {
  const request = { headers } as any;
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('JWT guards', () => {
  const jwtService = new JwtService({ secret: 'test-secret' });
  const userGuard = new JwtUserGuard(jwtService);
  const adminGuard = new JwtAdminGuard(jwtService);

  it('JwtUserGuard пропускает только user token', () => {
    const token = jwtService.sign({ sub: 'user_1', type: 'user', provider: 'telegram' });
    const ctx = createContext({ authorization: `Bearer ${token}` });

    expect(userGuard.canActivate(ctx)).toBe(true);
    expect(ctx.switchToHttp().getRequest().user).toMatchObject({
      id: 'user_1',
      type: 'user',
      provider: 'telegram',
    });
  });

  it('JwtUserGuard отклоняет admin token', () => {
    const token = jwtService.sign({ sub: 'admin_1', type: 'admin', role: 'SUPER_ADMIN' });
    const ctx = createContext({ authorization: `Bearer ${token}` });

    expect(() => userGuard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('JwtAdminGuard требует type=admin и роль из whitelist', () => {
    const token = jwtService.sign({
      sub: 'admin_1',
      type: 'admin',
      role: 'SUPER_ADMIN',
      email: 'admin@example.com',
    });
    const ctx = createContext({ authorization: `Bearer ${token}` });

    expect(adminGuard.canActivate(ctx)).toBe(true);
    expect(ctx.switchToHttp().getRequest().user).toMatchObject({
      id: 'admin_1',
      type: 'admin',
      role: 'SUPER_ADMIN',
      email: 'admin@example.com',
    });
  });

  it('JwtAdminGuard отклоняет user token и неизвестную роль', () => {
    const userToken = jwtService.sign({ sub: 'user_1', type: 'user' });
    const invalidRoleToken = jwtService.sign({ sub: 'admin_1', type: 'admin', role: 'HACKER' });

    expect(() =>
      adminGuard.canActivate(createContext({ authorization: `Bearer ${userToken}` })),
    ).toThrow(UnauthorizedException);

    expect(() =>
      adminGuard.canActivate(createContext({ authorization: `Bearer ${invalidRoleToken}` })),
    ).toThrow(UnauthorizedException);
  });
});
