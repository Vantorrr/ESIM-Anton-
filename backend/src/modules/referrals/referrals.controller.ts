import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { AuthUser, CurrentUser, JwtAdminGuard, JwtUserGuard } from '@/common/auth/jwt-user.guard';
import { ServiceTokenGuard } from '@/common/auth/service-token.guard';

@ApiTags('referrals')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post('register')
  @UseGuards(ServiceTokenGuard)
  @ApiOperation({ summary: 'Зарегистрировать реферала' })
  async register(
    @Body() dto: { userId: string; referralCode: string; telegramId: string | number },
  ) {
    const telegramId = BigInt(dto.telegramId);
    return this.referralsService.registerReferral(dto.userId, dto.referralCode, telegramId);
  }

  @Get('me')
  @UseGuards(JwtUserGuard)
  @ApiOperation({ summary: 'Получить собственную статистику реферальной программы' })
  async getMyStats(@CurrentUser() user: AuthUser) {
    return this.referralsService.getReferralStats(user.id);
  }

  @Get('stats/:userId')
  @UseGuards(JwtAdminGuard)
  @ApiOperation({ summary: 'Получить статистику реферальной программы' })
  async getStats(@Param('userId') userId: string) {
    return this.referralsService.getReferralStats(userId);
  }

  @Get('top')
  @UseGuards(JwtAdminGuard)
  @ApiOperation({ summary: 'Получить топ рефереров' })
  async getTop() {
    return this.referralsService.getTopReferrers();
  }
}
