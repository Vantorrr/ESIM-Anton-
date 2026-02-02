import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemSettingsService } from './system-settings.service';

@ApiTags('system-settings')
@ApiBearerAuth()
@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все настройки' })
  async getAll() {
    return this.systemSettingsService.getAll();
  }

  @Get('referral')
  @ApiOperation({ summary: 'Получить настройки реферальной программы' })
  async getReferralSettings() {
    return this.systemSettingsService.getReferralSettings();
  }

  @Post('referral')
  @ApiOperation({ summary: 'Обновить настройки реферальной программы' })
  async updateReferralSettings(
    @Body() data: { bonusPercent: number; minPayout: number; enabled: boolean }
  ) {
    return this.systemSettingsService.updateReferralSettings(data);
  }

  @Get('pricing')
  @ApiOperation({ summary: 'Получить настройки ценообразования' })
  async getPricingSettings() {
    return this.systemSettingsService.getPricingSettings();
  }

  @Post('pricing')
  @ApiOperation({ summary: 'Обновить настройки ценообразования' })
  async updatePricingSettings(
    @Body() data: { exchangeRate: number; defaultMarkupPercent: number }
  ) {
    return this.systemSettingsService.updatePricingSettings(data);
  }

  @Get('exchange-rate')
  @ApiOperation({ summary: 'Получить информацию о курсе валют' })
  async getExchangeRateInfo() {
    return this.systemSettingsService.getExchangeRateInfo();
  }

  @Post('exchange-rate/update')
  @ApiOperation({ summary: 'Обновить курс с ЦБ РФ' })
  async updateExchangeRate() {
    return this.systemSettingsService.updateExchangeRateFromCBR();
  }

  @Post('exchange-rate/auto-update')
  @ApiOperation({ summary: 'Включить/выключить автообновление курса (раз в сутки)' })
  async setAutoUpdateExchangeRate(@Body() data: { enabled: boolean }) {
    return this.systemSettingsService.setAutoUpdateExchangeRate(data.enabled);
  }

  @Get(':key')
  @ApiOperation({ summary: 'Получить настройку по ключу' })
  async getByKey(@Param('key') key: string) {
    return this.systemSettingsService.getByKey(key);
  }

  @Post(':key')
  @ApiOperation({ summary: 'Обновить настройку' })
  async upsert(@Param('key') key: string, @Body() data: { value: string; description?: string }) {
    return this.systemSettingsService.upsert(key, data.value, data.description);
  }
}
