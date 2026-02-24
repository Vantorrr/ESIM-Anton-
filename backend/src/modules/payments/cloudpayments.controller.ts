import { Controller, Post, Body, Res, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CloudPaymentsService } from './cloudpayments.service';

@ApiTags('payments')
@Controller('payments/cloudpayments')
export class CloudPaymentsController {
  constructor(private readonly cloudPaymentsService: CloudPaymentsService) {}

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
