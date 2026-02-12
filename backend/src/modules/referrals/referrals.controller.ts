import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';

@ApiTags('referrals')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post('register')
  @ApiOperation({ summary: 'Зарегистрировать реферала' })
  async register(@Body() dto: { userId: string; referralCode: string }) {
    return this.referralsService.registerReferral(dto.userId, dto.referralCode);
  }

  @Get('stats/:userId')
  @ApiOperation({ summary: 'Получить статистику реферальной программы' })
  async getStats(@Param('userId') userId: string) {
    return this.referralsService.getReferralStats(userId);
  }

  @Get('top')
  @ApiOperation({ summary: 'Получить топ рефереров' })
  async getTop() {
    return this.referralsService.getTopReferrers();
  }
}
