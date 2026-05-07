import { OrdersService } from './orders.service';
import { EsimStatus } from '../esim-provider/esim-status';

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order_1',
    iccid: '8965012601090428233',
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    product: { validityDays: 30 },
    lastUsageAt: null,
    lastUsageBytes: null,
    lastUsageTotalBytes: null,
    lowTrafficNotifiedAt: null,
    esimStatus: null,
    activatedAt: null,
    expiresAt: null,
    smdpAddress: null,
    activationCode: null,
    ...overrides,
  };
}

function makeService() {
  const prisma = {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const esimProviderService = {
    getEsimSnapshot: jest.fn(),
  };

  const service = new (OrdersService as any)(
    prisma,
    {},
    {},
    esimProviderService,
    {},
    {},
    {},
    {},
  ) as OrdersService;

  return {
    service,
    prisma,
    esimProviderService,
  };
}

describe('OrdersService.getOrderUsage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('сохраняет вычисленный usedBytes в кэш, если провайдер прислал только remainingBytes', async () => {
    const { service, prisma, esimProviderService } = makeService();
    prisma.order.findUnique.mockResolvedValue(makeOrder());
    prisma.order.update.mockResolvedValue({});
    esimProviderService.getEsimSnapshot.mockResolvedValue({
      usedBytes: null,
      totalBytes: 1000,
      remainingBytes: 1000,
      status: EsimStatus.NOT_INSTALLED,
      rawStatus: 'NEW',
      activatedAt: null,
      expiresAt: null,
      smdpAddress: null,
      activationCode: null,
    });

    const usage = await service.getOrderUsage('order_1');

    expect(usage.available).toBe(true);
    expect(usage.usedBytes).toBe(0);
    expect(usage.remainingBytes).toBe(1000);
    expect(usage.percentTraffic).toBe(100);
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order_1' },
        data: expect.objectContaining({
          lastUsageBytes: BigInt(0),
          lastUsageTotalBytes: BigInt(1000),
          esimStatus: EsimStatus.NOT_INSTALLED,
          lastUsageAt: expect.any(Date),
        }),
      }),
    );
  });

  it('отдаёт свежий кэш без повторного запроса к провайдеру', async () => {
    const { service, prisma, esimProviderService } = makeService();
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({
        lastUsageAt: new Date(Date.now() - 60_000),
        lastUsageBytes: BigInt(250),
        lastUsageTotalBytes: BigInt(1000),
        esimStatus: EsimStatus.ACTIVE,
      }),
    );

    const usage = await service.getOrderUsage('order_1');

    expect(usage.available).toBe(true);
    expect(usage.usedBytes).toBe(250);
    expect(usage.remainingBytes).toBe(750);
    expect(usage.percentTraffic).toBe(75);
    expect(usage.status).toBe(EsimStatus.ACTIVE);
    expect(esimProviderService.getEsimSnapshot).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('возвращает stale status/expiry, если provider недоступен, но метаданные уже закэшированы', async () => {
    const { service, prisma, esimProviderService } = makeService();
    const expiresAt = new Date(Date.now() + 10 * 86400000);
    prisma.order.findUnique.mockResolvedValue(
      makeOrder({
        esimStatus: EsimStatus.ACTIVE,
        expiresAt,
      }),
    );
    esimProviderService.getEsimSnapshot.mockRejectedValue(new Error('provider down'));

    const usage = await service.getOrderUsage('order_1');

    expect(usage.available).toBe(false);
    expect(usage.stale).toBe(true);
    expect(usage.status).toBe(EsimStatus.ACTIVE);
    expect(usage.expiresAt).toEqual(expiresAt);
    expect(usage.reason).toBe('Данные о расходе ещё не поступили от провайдера');
  });
});
