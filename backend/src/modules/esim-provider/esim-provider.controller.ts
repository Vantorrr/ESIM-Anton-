import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EsimProviderService } from './esim-provider.service';

@ApiTags('esim-provider')
@ApiBearerAuth()
@Controller('esim-provider')
export class EsimProviderController {
  constructor(private readonly esimProviderService: EsimProviderService) {}

  @Get('packages')
  @ApiOperation({ summary: 'Получить список доступных пакетов от провайдера' })
  async getPackages(@Query('country') country?: string) {
    return this.esimProviderService.getPackages(country);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Купить eSIM у провайдера' })
  async purchaseEsim(@Body() dto: { packageId: string; email?: string }) {
    return this.esimProviderService.purchaseEsim(dto.packageId, dto.email);
  }

  @Get('orders/:orderId/status')
  @ApiOperation({ summary: 'Проверить статус заказа у провайдера' })
  async checkOrderStatus(@Param('orderId') orderId: string) {
    return this.esimProviderService.checkOrderStatus(orderId);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Синхронизировать продукты с провайдером' })
  async syncProducts() {
    return this.esimProviderService.syncProducts();
  }

  @Get('health')
  @ApiOperation({ summary: 'Проверить доступность провайдеров' })
  async healthCheck() {
    return this.esimProviderService.healthCheck();
  }
}
