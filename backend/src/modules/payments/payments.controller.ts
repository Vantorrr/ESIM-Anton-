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
   * Принимает POST с form-data или query params
   * Должен вернуть plain text "OK{InvId}"
   */
  @Post('webhook')
  @HttpCode(200)
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Webhook от Robokassa (ResultURL)' })
  async handleWebhook(@Body() body: any, @Query() query: any, @Res() res: any) {
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
  async handleSuccess(@Query() query: any, @Res() res: any) {
    const { InvId } = query;
    const miniAppUrl = process.env.MINI_APP_URL || 'https://esim-anton-production.up.railway.app';
    const redirectUrl = `${miniAppUrl}/orders?payment=success&invId=${InvId || ''}`;

    // Возвращаем HTML, который закроет окно в Telegram WebApp или сделает редирект
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Оплата успешна</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 20px; background: #f8f9fa; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .success-icon { font-size: 64px; margin-bottom: 20px; }
          h2 { color: #333; margin-bottom: 10px; }
          p { color: #666; margin-bottom: 30px; }
          .btn { background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; width: 100%; max-width: 300px; box-sizing: border-box; }
          .btn:active { transform: scale(0.98); }
        </style>
      </head>
      <body>
        <div class="success-icon">✅</div>
        <h2>Оплата прошла успешно!</h2>
        <p>Ваш заказ оплачен.</p>
        
        <a href="${redirectUrl}" id="btn" class="btn">Вернуться в магазин</a>
        <br><br>
        <button onclick="closeApp()" class="btn" style="background: #6c757d;">Закрыть окно</button>

        <script>
          function closeApp() {
            if (window.Telegram && window.Telegram.WebApp) {
              window.Telegram.WebApp.close();
            } else {
              window.close();
            }
          }

          // Автоматический редирект
          setTimeout(() => {
             window.location.href = "${redirectUrl}";
          }, 1000);
        </script>
      </body>
      </html>
    `);
  }

  /**
   * Fail URL - редирект при ошибке оплаты
   */
  @Get('fail')
  @ApiOperation({ summary: 'Fail URL для Robokassa' })
  async handleFail(@Query() query: any, @Res() res: any) {
    const { InvId } = query;
    const miniAppUrl = process.env.MINI_APP_URL || 'https://esim-anton-production.up.railway.app';
    const redirectUrl = `${miniAppUrl}/orders?payment=failed&invId=${InvId || ''}`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ошибка оплаты</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 20px; background: #fff5f5; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .error-icon { font-size: 64px; margin-bottom: 20px; }
          h2 { color: #333; margin-bottom: 10px; }
          p { color: #666; margin-bottom: 30px; }
          .btn { background: #6c757d; color: white; border: none; padding: 12px 24px; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; width: 100%; max-width: 300px; box-sizing: border-box; }
        </style>
      </head>
      <body>
        <div class="error-icon">❌</div>
        <h2>Оплата не прошла</h2>
        <p>К сожалению, произошла ошибка при оплате.</p>
        
        <a href="${redirectUrl}" class="btn">Вернуться в магазин</a>
        <br><br>
        <button onclick="closeApp()" class="btn" style="background: #333;">Закрыть окно</button>

        <script>
          function closeApp() {
            if (window.Telegram && window.Telegram.WebApp) {
              window.Telegram.WebApp.close();
            } else {
              window.close();
            }
          }
          
          setTimeout(() => {
            window.location.href = "${redirectUrl}";
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
