import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@ApiBearerAuth()
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('levels')
  @ApiOperation({ summary: 'Получить все уровни лояльности' })
  async getLevels() {
    return this.loyaltyService.getLevels();
  }

  @Get('levels/:id')
  @ApiOperation({ summary: 'Получить уровень по ID' })
  async getLevelById(@Param('id') id: string) {
    return this.loyaltyService.getLevelById(id);
  }

  @Post('levels')
  @ApiOperation({ summary: 'Создать уровень лояльности' })
  async createLevel(@Body() data: any) {
    return this.loyaltyService.createLevel(data);
  }

  @Put('levels/:id')
  @ApiOperation({ summary: 'Обновить уровень лояльности' })
  async updateLevel(@Param('id') id: string, @Body() data: any) {
    return this.loyaltyService.updateLevel(id, data);
  }

  @Delete('levels/:id')
  @ApiOperation({ summary: 'Удалить уровень лояльности' })
  async deleteLevel(@Param('id') id: string) {
    return this.loyaltyService.deleteLevel(id);
  }

  @Get('level/:levelId/users')
  @ApiOperation({ summary: 'Получить пользователей по уровню' })
  async getUsersByLevel(@Param('levelId') levelId: string) {
    return this.loyaltyService.getUsersByLevel(levelId);
  }
}
