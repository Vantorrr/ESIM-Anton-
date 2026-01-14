import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все продукты' })
  async findAll(@Query('country') country?: string) {
    return this.productsService.findAll({ country });
  }

  @Get('countries')
  @ApiOperation({ summary: 'Получить список стран' })
  async getCountries() {
    return this.productsService.getCountries();
  }

  @Post('sync')
  @ApiOperation({ summary: 'Синхронизировать с провайдером' })
  async sync() {
    return this.productsService.syncWithProvider();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить продукт по ID' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать продукт' })
  async create(@Body() createDto: any) {
    return this.productsService.create(createDto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить продукт' })
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.productsService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить продукт' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
