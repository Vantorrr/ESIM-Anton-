import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAdminGuard } from '@/common/auth/jwt-user.guard';
import { EsimProviderService } from './esim-provider.service';

@ApiTags('esim-provider')
@ApiBearerAuth()
@UseGuards(JwtAdminGuard)
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
    try {
      return await this.esimProviderService.queryOrder(orderId);
    } catch (error) {
      return { error: true, message: error.message };
    }
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
