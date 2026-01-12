import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить список всех пользователей' })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.usersService.findAll(+page, +limit);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить пользователя по ID' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get(':id/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить статистику пользователя' })
  async getStats(@Param('id') id: string) {
    return this.usersService.getUserStats(id);
  }

  @Post('find-or-create')
  @ApiOperation({ summary: 'Найти или создать пользователя (для бота)' })
  async findOrCreate(@Body() dto: {
    telegramId: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }) {
    return this.usersService.findOrCreate(
      BigInt(dto.telegramId),
      dto
    );
  }
}
