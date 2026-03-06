import { Controller, Post, Get, Body, Res, HttpCode, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CloudPaymentsService } from './cloudpayments.service';
import { TelegramNotificationService } from '../telegram/telegram-notification.service';

@ApiTags('payments')
@Controller('payments/cloudpayments')
export class CloudPaymentsController {
  constructor(
    private readonly cloudPaymentsService: CloudPaymentsService,
    private readonly telegramNotification: TelegramNotificationService,
  ) {}

  @Get('test-notify')
  @ApiOperation({ summary: 'Test Telegram notification' })
  async testNotify(@Query('telegramId') telegramId: string) {
    try {
      await this.telegramNotification.sendPaymentSuccessNotification(
        telegramId || '316662303',
        {
          orderId: 'test-order-id',
          productName: 'Test eSIM',
          country: 'RU',
          dataAmount: '10 GB',
          price: 45,
        }
      );
      return { success: true, message: `Notification sent to ${telegramId || '316662303'}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @Post('check')
  @HttpCode(200)
  @ApiOperation({ summary: 'CloudPayments Check Notification' })
  async check(@Body() body: any, @Res() res: any) {
    const result = await this.cloudPaymentsService.handleCheck(body);
    res.json(result);
  }

  @Post('pay')
  @HttpCode(200)
  @ApiOperation({ summary: 'CloudPayments Pay Notification' })
  async pay(@Body() body: any, @Res() res: any) {
    const result = await this.cloudPaymentsService.handlePay(body);
    res.json(result);
  }

  @Post('fail')
  @HttpCode(200)
  @ApiOperation({ summary: 'CloudPayments Fail Notification' })
  async fail(@Body() body: any, @Res() res: any) {
    const result = await this.cloudPaymentsService.handleFail(body);
    res.json(result);
  }
}
