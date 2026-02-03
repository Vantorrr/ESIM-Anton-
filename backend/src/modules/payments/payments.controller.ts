import { Controller, Get, Post, Param, Body, Query, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { Response } from 'express';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать платеж для заказа' })
  async createPayment(@Body() dto: { orderId: string }) {
    return this.paymentsService.createPayment(dto.orderId);
  }

  /**
   * Robokassa ResultURL webhook
   * Принимает POST с form-data или query params
   * Должен вернуть plain text "OK{InvId}"
   */
  @Post('webhook')
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Webhook от Robokassa (ResultURL)' })
  async handleWebhook(@Body() body: any, @Query() query: any, @Res() res: Response) {
    // Robokassa может отправлять данные как в body, так и в query
    const payload = { ...query, ...body };
    
    try {
      const result = await this.paymentsService.handleWebhook(payload);
      // Robokassa ожидает plain text ответ "OK{InvId}"
      res.send(result);
    } catch (error) {
      res.status(400).send(`error: ${error.message}`);
    }
  }

  /**
   * Success URL - редирект после успешной оплаты
   */
  @Get('success')
  @ApiOperation({ summary: 'Success URL для Robokassa' })
  async handleSuccess(@Query() query: any, @Res() res: Response) {
    const { InvId } = query;
    // Редирект в Mini App с параметром успеха
    const miniAppUrl = process.env.MINI_APP_URL || 'https://esim-anton-production.up.railway.app';
    res.redirect(`${miniAppUrl}/orders?payment=success&invId=${InvId || ''}`);
  }

  /**
   * Fail URL - редирект при ошибке оплаты
   */
  @Get('fail')
  @ApiOperation({ summary: 'Fail URL для Robokassa' })
  async handleFail(@Query() query: any, @Res() res: Response) {
    const { InvId } = query;
    const miniAppUrl = process.env.MINI_APP_URL || 'https://esim-anton-production.up.railway.app';
    res.redirect(`${miniAppUrl}/orders?payment=failed&invId=${InvId || ''}`);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить все транзакции' })
  async findAll(
    @Query('status') status?: TransactionStatus,
    @Query('type') type?: TransactionType,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.paymentsService.findAll({ status, type, page: +page, limit: +limit });
  }

  @Get('user/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить транзакции пользователя' })
  async findByUser(@Param('userId') userId: string) {
    return this.paymentsService.findByUser(userId);
  }
}
