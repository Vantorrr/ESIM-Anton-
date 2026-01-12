import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';

@ApiTags('referrals')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

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
