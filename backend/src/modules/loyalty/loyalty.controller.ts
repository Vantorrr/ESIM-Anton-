import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, JwtAdminGuard, JwtUserGuard, type AuthUser } from '@/common/auth/jwt-user.guard';
import { LoyaltyService } from './loyalty.service';
import { UpsertLoyaltyLevelDto } from './dto/upsert-loyalty-level.dto';

@ApiTags('loyalty')
@ApiBearerAuth()
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('me')
  @UseGuards(JwtUserGuard)
  @ApiOperation({ summary: 'Получить программу лояльности текущего пользователя' })
  async getMyProgram(@CurrentUser() user: AuthUser) {
    return this.loyaltyService.getUserProgram(user.id);
  }

  @Get('levels')
  @UseGuards(JwtAdminGuard)
  @ApiOperation({ summary: 'Получить все уровни лояльности' })
  async getLevels() {
    return this.loyaltyService.getLevels();
  }

  @Get('levels/:id')
  @UseGuards(JwtAdminGuard)
  @ApiOperation({ summary: 'Получить уровень по ID' })
  async getLevelById(@Param('id') id: string) {
    return this.loyaltyService.getLevelById(id);
  }

  @Post('levels')
  @UseGuards(JwtAdminGuard)
  @ApiOperation({ summary: 'Создать уровень лояльности' })
  async createLevel(@Body() data: UpsertLoyaltyLevelDto) {
    return this.loyaltyService.createLevel(data);
  }

  @Put('levels/:id')
  @UseGuards(JwtAdminGuard)
  @ApiOperation({ summary: 'Обновить уровень лояльности' })
  async updateLevel(@Param('id') id: string, @Body() data: UpsertLoyaltyLevelDto) {
    return this.loyaltyService.updateLevel(id, data);
  }

  @Delete('levels/:id')
  @UseGuards(JwtAdminGuard)
  @ApiOperation({ summary: 'Удалить уровень лояльности' })
  async deleteLevel(@Param('id') id: string) {
    return this.loyaltyService.deleteLevel(id);
  }

  @Get('level/:levelId/users')
  @UseGuards(JwtAdminGuard)
  @ApiOperation({ summary: 'Получить пользователей по уровню' })
  async getUsersByLevel(@Param('levelId') levelId: string) {
    return this.loyaltyService.getUsersByLevel(levelId);
  }
}
