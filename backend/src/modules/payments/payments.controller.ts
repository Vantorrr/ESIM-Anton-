import { Controller, Get, Post, Param, Body, Query, Res, Header, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { TransactionStatus, TransactionType } from '@prisma/client';

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
   */
  @Post('webhook')
  @HttpCode(200)
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Webhook от Robokassa (ResultURL)' })
  async handleWebhook(@Body() body: any, @Query() query: any, @Res() res: any) {
    const payload = { ...query, ...body };
    
    try {
      const result = await this.paymentsService.handleWebhook(payload);
      res.send(result);
    } catch (error) {
      res.status(400).send(`error: ${error.message}`);
    }
  }

  /**
   * Success URL
   */
  @Get('success')
  @ApiOperation({ summary: 'Success URL для Robokassa' })
  async handleSuccess(@Query() query: any, @Res() res: any) {
    const { InvId } = query;
    // Редирект в Telegram Mini App с параметром для открытия страницы my-esim
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'mojo_mobile_bot';
    const telegramUrl = `https://t.me/${botUsername}/app?startapp=my-esim`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Оплата успешна</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="refresh" content="2;url=${telegramUrl}">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; color: white; }
          .success-icon { font-size: 80px; margin-bottom: 20px; animation: bounce 1s ease-in-out; }
          @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
          h2 { color: white; margin-bottom: 10px; font-size: 28px; }
          p { color: rgba(255,255,255,0.9); margin-bottom: 30px; font-size: 18px; }
          .btn { background: white; color: #667eea; border: none; padding: 14px 28px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; width: 100%; max-width: 300px; box-sizing: border-box; margin-bottom: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
          .loader { border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid white; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="success-icon">✅</div>
        <h2>Оплата прошла!</h2>
        <p>Ваш eSIM готов к использованию</p>
        <div class="loader"></div>
        <p style="font-size: 14px; opacity: 0.8;">Возвращаемся в Telegram...</p>
        <a href="${telegramUrl}" class="btn">Открыть в Telegram</a>
        
        <script>
          console.log('✅ Success page loaded, redirecting to Telegram');
          setTimeout(() => {
            window.location.replace('${telegramUrl}');
          }, 2000);
        </script>
      </body>
      </html>
    `);
  }

  /**
   * Fail URL
   */
  @Get('fail')
  @ApiOperation({ summary: 'Fail URL для Robokassa' })
  async handleFail(@Query() query: any, @Res() res: any) {
    const { InvId } = query;
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'mojo_mobile_bot';
    const returnUrl = `https://t.me/${botUsername}/app`; // Простой редирект

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ошибка оплаты</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="refresh" content="2;url=${returnUrl}">
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 20px; background: linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; color: white; }
          .error-icon { font-size: 80px; margin-bottom: 20px; }
          h2 { color: white; margin-bottom: 10px; font-size: 28px; }
          p { color: rgba(255,255,255,0.9); margin-bottom: 30px; font-size: 18px; }
          .btn { background: white; color: #fc5c7d; border: none; padding: 14px 28px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; width: 100%; max-width: 300px; box-sizing: border-box; margin-bottom: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        </style>
      </head>
      <body>
        <div class="error-icon">❌</div>
        <h2>Оплата не прошла</h2>
        <p>Попробуйте еще раз или выберите другой способ оплаты</p>
        
        <script>
          console.log('❌ Failed page loaded, redirecting to:', '${returnUrl}');
          setTimeout(() => {
            window.location.replace('${returnUrl}');
          }, 2000);
        </script>
      </body>
      </html>
    `);
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