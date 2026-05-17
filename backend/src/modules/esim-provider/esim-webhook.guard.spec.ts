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
  function makeGuard() {
    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'ESIMACCESS_SECRET_KEY') return 'secret';
        if (key === 'ESIMACCESS_ACCESS_CODE') return 'access-code';
        if (key === 'ESIM_WEBHOOK_UNSIGNED_MAX_AGE_MS') return String(15 * 60 * 1000);
        if (key === 'ESIM_WEBHOOK_UNSIGNED_FUTURE_SKEW_MS') return String(2 * 60 * 1000);
        return '';
      }),
    };

    const replayService = {
      claimUnsignedOrderStatus: jest.fn().mockResolvedValue({
        receiptId: 'receipt_1',
        dedupKey: 'unsigned-order-status:notify_1',
      }),
    };

    return {
      guard: new EsimWebhookGuard(configService as any, replayService as any),
      replayService,
    };
  }

  beforeEach(() => jest.clearAllMocks());

  it('пропускает CHECK_HEALTH без подписи', async () => {
    const { guard, replayService } = makeGuard();
    const req = {
      headers: {},
      body: { notifyType: 'CHECK_HEALTH' },
    };

    await expect(guard.canActivate(createContext(req))).resolves.toBe(true);
    expect(replayService.claimUnsignedOrderStatus).not.toHaveBeenCalled();
  });

  it('пропускает live webhook без подписи при валидном rt-accesscode только для ORDER_STATUS', async () => {
    const { guard, replayService } = makeGuard();
    const req = {
      headers: {
        'rt-accesscode': 'access-code',
      },
      body: {
        notifyType: 'ORDER_STATUS',
        notifyId: 'notify_1',
        eventGenerateTime: new Date().toISOString(),
        content: {
          orderNo: 'B123',
          orderStatus: 'GOT_RESOURCE',
        },
      },
    };

    await expect(guard.canActivate(createContext(req))).resolves.toBe(true);
    expect(replayService.claimUnsignedOrderStatus).toHaveBeenCalledWith(req.body);
    expect((req as any).esimUnsignedWebhookReceiptId).toBe('receipt_1');
  });

  it('отклоняет неподписанный webhook без валидного rt-accesscode', async () => {
    const { guard } = makeGuard();
    const req = {
      headers: {
        'rt-accesscode': 'wrong',
      },
      body: {
        notifyType: 'ORDER_STATUS',
      },
    };

    await expect(guard.canActivate(createContext(req))).rejects.toThrow(UnauthorizedException);
  });

  it('отклоняет unsigned webhook с валидным rt-accesscode, если тип не разрешён', async () => {
    const { guard, replayService } = makeGuard();
    replayService.claimUnsignedOrderStatus.mockRejectedValue(
      new UnauthorizedException('Unsigned webhook type is not allowed'),
    );
    const req = {
      headers: {
        'rt-accesscode': 'access-code',
      },
      body: {
        notifyType: 'DATA_USAGE',
        notifyId: 'notify_2',
        eventGenerateTime: new Date().toISOString(),
        content: {
          iccid: '8988',
        },
      },
    };

    await expect(guard.canActivate(createContext(req))).rejects.toThrow(UnauthorizedException);
  });
});
