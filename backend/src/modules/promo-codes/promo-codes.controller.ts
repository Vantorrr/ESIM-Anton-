import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PromoCodesService } from './promo-codes.service';

@ApiTags('promo-codes')
@Controller('promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Get()
  @ApiOperation({ summary: 'Все промокоды (для админки)' })
  async findAll() {
    return this.promoCodesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Создать промокод' })
  async create(
    @Body()
    body: {
      code: string;
      discountPercent: number;
      maxUses?: number;
      expiresAt?: string;
    },
  ) {
    return this.promoCodesService.create(body);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Проверить промокод (для фронта)' })
  async validate(@Query('code') code: string) {
    return this.promoCodesService.validate(code);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Включить/выключить промокод' })
  async toggle(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.promoCodesService.toggleActive(id, body.isActive);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить промокод' })
  async delete(@Param('id') id: string) {
    return this.promoCodesService.delete(id);
  }
}
