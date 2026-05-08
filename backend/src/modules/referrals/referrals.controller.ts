import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ReferralsService } from './referrals.service';
import { AuthUser, CurrentUser, JwtAdminGuard, JwtUserGuard } from '@/common/auth/jwt-user.guard';

@ApiTags('referrals')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralsController {
  constructor(
    private readonly referralsService: ReferralsService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Зарегистрировать реферала' })
  async register(
    @Headers('x-telegram-bot-token') botToken: string | undefined,
    @Body() dto: { userId: string; referralCode: string; telegramId: string | number },
  ) {
    const configuredBotToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!configuredBotToken || botToken !== configuredBotToken) {
      throw new ForbiddenException('Bot authorization required');
    }

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
