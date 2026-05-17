import { Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { JwtAdminGuard } from '@/common/auth/jwt-user.guard';
import { EsimProviderService } from './esim-provider.service';
import { EsimWebhookService, EsimWebhookPayload } from './esim-webhook.service';
import { EsimWebhookGuard } from './esim-webhook.guard';
import { EsimWebhookReplayService } from './esim-webhook-replay.service';

@ApiTags('esim-provider')
@Controller('esim-provider')
export class EsimProviderController {
  constructor(
    private readonly esimProviderService: EsimProviderService,
    private readonly esimWebhookService: EsimWebhookService,
    private readonly esimWebhookReplayService: EsimWebhookReplayService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────
  // Webhook от eSIM Access (публичный, без JWT)
  // ─────────────────────────────────────────────────────────────────────

  @Post('webhook')
  @HttpCode(200)
  @UseGuards(EsimWebhookGuard)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Body() payload: EsimWebhookPayload,
    @Req() req: { esimUnsignedWebhookReceiptId?: string },
  ) {
    try {
      await this.esimWebhookService.handleWebhook(payload);
      await this.esimWebhookReplayService.confirmReceipt(req.esimUnsignedWebhookReceiptId);
      return { success: true };
    } catch (error) {
      await this.esimWebhookReplayService.releaseReceipt(req.esimUnsignedWebhookReceiptId);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Admin-only endpoints (JWT protected)
  // ─────────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get('packages')
  @ApiOperation({ summary: 'Получить список доступных пакетов от провайдера' })
  async getPackages(@Query('country') country?: string) {
    return this.esimProviderService.getPackages(country);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Post('purchase')
  @ApiOperation({ summary: 'Купить eSIM у провайдера' })
  async purchaseEsim(@Body() dto: { packageId: string; email?: string }) {
    return this.esimProviderService.purchaseEsim(dto.packageId, dto.email);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get('orders/:orderId/status')
  @ApiOperation({ summary: 'Проверить статус заказа у провайдера' })
  async checkOrderStatus(@Param('orderId') orderId: string) {
    try {
      return await this.esimProviderService.queryOrder(orderId);
    } catch (error) {
      return { error: true, message: error.message };
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Post('sync')
  @ApiOperation({ summary: 'Синхронизировать продукты с провайдером' })
  async syncProducts() {
    return this.esimProviderService.syncProducts();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAdminGuard)
  @Get('health')
  @ApiOperation({ summary: 'Проверить доступность провайдеров' })
  async healthCheck() {
    return this.esimProviderService.healthCheck();
  }
}
