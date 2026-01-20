import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';

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
  constructor(private readonly usersService: UsersService) {}

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
    // UTM метки для аналитики
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
}
