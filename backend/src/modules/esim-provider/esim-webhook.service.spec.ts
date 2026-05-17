import { EsimWebhookService } from './esim-webhook.service';

function makeService() {
  const prisma = {
    order: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
  };

  const telegramNotification = {
    notifyAdmin: jest.fn().mockResolvedValue(undefined),
    sendTextNotification: jest.fn().mockResolvedValue(undefined),
  };

  const esimProviderService = {
    queryOrder: jest.fn(),
  };

  const service = new EsimWebhookService(
    prisma as any,
    telegramNotification as any,
    esimProviderService as any,
  );

  return { service, prisma, telegramNotification, esimProviderService };
}

describe('EsimWebhookService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ORDER_STATUS GOT_RESOURCE дообогащает локальный заказ через provider query', async () => {
    const { service, prisma, esimProviderService } = makeService();

    prisma.order.findFirst.mockResolvedValue({
      id: 'order_1',
      iccid: null,
      qrCode: null,
      activationCode: null,
      smdpAddress: null,
    });
    esimProviderService.queryOrder.mockResolvedValue({
      esimList: [
        {
          iccid: '8988',
          qrCodeUrl: 'https://qr.example',
          lpaCode: 'LPA:1$example',
          smdpAddress: 'rsp.example',
        },
      ],
    });

    await service.handleWebhook({
      notifyType: 'ORDER_STATUS',
      content: {
        orderNo: 'B123',
        orderStatus: 'GOT_RESOURCE',
      },
    });

    expect(esimProviderService.queryOrder).toHaveBeenCalledWith('B123');
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'order_1' },
      data: {
        iccid: '8988',
        qrCode: 'https://qr.example',
        activationCode: 'LPA:1$example',
        smdpAddress: 'rsp.example',
        providerResponse: {
          esimList: [
            {
              iccid: '8988',
              qrCodeUrl: 'https://qr.example',
              lpaCode: 'LPA:1$example',
              smdpAddress: 'rsp.example',
            },
          ],
        },
      },
    });
  });

  it('ORDER_STATUS без orderNo не падает', async () => {
    const { service, prisma, esimProviderService } = makeService();

    await service.handleWebhook({
      notifyType: 'ORDER_STATUS',
      content: {
        orderStatus: 'GOT_RESOURCE',
      },
    });

    expect(prisma.order.findFirst).not.toHaveBeenCalled();
    expect(esimProviderService.queryOrder).not.toHaveBeenCalled();
  });
});
