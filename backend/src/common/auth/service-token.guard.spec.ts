import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ServiceTokenGuard } from './service-token.guard';

function createContext(header?: string) {
  const request = {
    headers: header ? { 'x-telegram-bot-token': header } : {},
  } as any;

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

describe('ServiceTokenGuard', () => {
  const configService = {
    get: jest.fn().mockReturnValue('bot-token'),
  };

  const guard = new ServiceTokenGuard(configService as any);

  beforeEach(() => jest.clearAllMocks());

  it('пропускает валидный service token', () => {
    const ctx = createContext('bot-token');

    expect(guard.canActivate(ctx)).toBe(true);
    expect(ctx.switchToHttp().getRequest().service).toEqual({ type: 'telegram-bot' });
  });

  it('возвращает 401 если header отсутствует', () => {
    expect(() => guard.canActivate(createContext())).toThrow(UnauthorizedException);
  });

  it('возвращает 403 если token не совпал', () => {
    expect(() => guard.canActivate(createContext('wrong-token'))).toThrow(ForbiddenException);
  });
});
