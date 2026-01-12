import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все заказы' })
  async findAll(
    @Query('status') status?: OrderStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.ordersService.findAll({ status, page: +page, limit: +limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить заказ по ID' })
  async findOne(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Получить заказы пользователя' })
  async findByUser(@Param('userId') userId: string) {
    return this.ordersService.findByUser(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать заказ' })
  async create(@Body() createDto: { userId: string; productId: string; quantity?: number; useBonuses?: number }) {
    return this.ordersService.create(
      createDto.userId,
      createDto.productId,
      createDto.quantity,
      createDto.useBonuses,
    );
  }
}
