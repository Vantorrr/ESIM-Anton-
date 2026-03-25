import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { PushService } from '../notifications/push.service';

// Хелпер для сериализации BigInt в JSON
function serializeUser(user: any): any {
  if (!user) return user;
  return JSON.parse(JSON.stringify(user, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly pushService: PushService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить список всех пользователей' })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    const result = await this.usersService.findAll(+page, +limit);
    return {
      ...result,
      data: result.data.map(serializeUser),
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить пользователя по ID' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return serializeUser(user);
  }

  @Get(':id/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить статистику пользователя' })
  async getStats(@Param('id') id: string) {
    const stats = await this.usersService.getUserStats(id);
    return {
      ...stats,
      user: serializeUser(stats.user),
    };
  }

  @Post('find-or-create')
  @ApiOperation({ summary: 'Найти или создать пользователя (для бота)' })
  async findOrCreate(@Body() dto: {
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }) {
    const { telegramId, ...userData } = dto;
    const user = await this.usersService.findOrCreate(
      BigInt(telegramId),
      userData
    );
    return serializeUser(user);
  }

  @Patch('me/email')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Сохранить email текущего пользователя' })
  async updateMyEmail(
    @Headers('authorization') authHeader: string,
    @Body() dto: { email: string },
  ) {
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('No token');
    const token = authHeader.slice(7);
    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    if (!userId) throw new UnauthorizedException('Invalid token payload');
    const updated = await this.usersService.updateEmail(userId, dto.email);
    return serializeUser(updated);
  }

  @Get('push/vapid-public-key')
  @ApiOperation({ summary: 'Получить VAPID публичный ключ для web push' })
  getVapidPublicKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post(':id/push/subscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подписаться на web push уведомления' })
  async subscribePush(
    @Param('id') userId: string,
    @Body() dto: { endpoint: string; p256dh: string; auth: string },
  ) {
    await this.pushService.subscribe(userId, dto);
    return { success: true };
  }

  @Delete(':id/push/unsubscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отписаться от web push уведомлений' })
  async unsubscribePush(
    @Param('id') userId: string,
    @Body() dto: { endpoint: string },
  ) {
    await this.pushService.unsubscribe(dto.endpoint);
    return { success: true };
  }
}
