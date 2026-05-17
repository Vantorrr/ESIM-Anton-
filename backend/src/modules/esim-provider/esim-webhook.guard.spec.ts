import { UnauthorizedException } from '@nestjs/common';
import { EsimWebhookGuard } from './esim-webhook.guard';

function createContext(request: any) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

describe('EsimWebhookGuard', () => {
  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'ESIMACCESS_SECRET_KEY') return 'secret';
      if (key === 'ESIMACCESS_ACCESS_CODE') return 'access-code';
      return '';
    }),
  };

  const guard = new EsimWebhookGuard(configService as any);

  beforeEach(() => jest.clearAllMocks());

  it('пропускает CHECK_HEALTH без подписи', () => {
    const req = {
      headers: {},
      body: { notifyType: 'CHECK_HEALTH' },
    };

    expect(guard.canActivate(createContext(req))).toBe(true);
  });

  it('пропускает live webhook без подписи при валидном rt-accesscode', () => {
    const req = {
      headers: {
        'rt-accesscode': 'access-code',
      },
      body: {
        notifyType: 'ORDER_STATUS',
        content: {
          orderNo: 'B123',
          orderStatus: 'GOT_RESOURCE',
        },
      },
    };

    expect(guard.canActivate(createContext(req))).toBe(true);
  });

  it('отклоняет неподписанный webhook без валидного rt-accesscode', () => {
    const req = {
      headers: {
        'rt-accesscode': 'wrong',
      },
      body: {
        notifyType: 'ORDER_STATUS',
      },
    };

    expect(() => guard.canActivate(createContext(req))).toThrow(UnauthorizedException);
  });
});
