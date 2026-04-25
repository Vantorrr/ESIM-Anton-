import { Controller, Get, Post, Param, Body, Query, BadRequestException } from '@nestjs/common';
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

  @Get('user/:userId/check-new')
  @ApiOperation({ summary: 'Проверить новые оплаченные заказы (за последние 10 минут)' })
  async checkNewOrders(@Param('userId') userId: string) {
    return this.ordersService.checkNewOrders(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Создать заказ' })
  async create(
    @Body()
    createDto: {
      userId: string;
      productId: string;
      quantity?: number;
      useBonuses?: number;
      periodNum?: number;
      promoCode?: string;
    },
  ) {
    return this.ordersService.create(
      createDto.userId,
      createDto.productId,
      createDto.quantity,
      createDto.useBonuses,
      createDto.periodNum,
      createDto.promoCode,
    );
  }

  @Post(':id/fulfill-free')
  @ApiOperation({ summary: 'Выполнить бесплатный заказ (промокод 100%)' })
  async fulfillFree(@Param('id') id: string) {
    const order = await this.ordersService.findById(id);
    if (!order) throw new BadRequestException('Заказ не найден');
    if (Number(order.totalAmount) > 0) {
      throw new BadRequestException('Заказ не бесплатный');
    }
    await this.ordersService.updateStatus(id, OrderStatus.PAID);
    return this.ordersService.fulfillOrder(id);
  }

  @Get(':id/usage')
  @ApiOperation({ summary: 'Расход трафика по eSIM (с кэшированием)' })
  async getUsage(@Param('id') id: string, @Query('force') force?: string) {
    const usage = await this.ordersService.getOrderUsage(id, 300, force === 'true');

    // Преобразуем BigInt-подобные значения в Number, чтобы JSON был корректным
    const toNum = (v: number | null) =>
      v === null || v === undefined ? null : Number(v);

    return {
      available: usage.available,
      reason: 'reason' in usage ? usage.reason : undefined,
      usedBytes: toNum(usage.usedBytes),
      totalBytes: toNum(usage.totalBytes),
      remainingBytes: toNum(usage.remainingBytes),
      updatedAt: usage.updatedAt,
    };
  }

  @Get(':id/topup-packages')
  @ApiOperation({ summary: 'Список пакетов пополнения для eSIM' })
  async getTopupPackages(@Param('id') id: string) {
    return this.ordersService.getTopupPackagesForOrder(id);
  }

  @Post(':id/topup')
  @ApiOperation({ summary: 'Пополнить eSIM выбранным пакетом' })
  async topup(@Param('id') id: string, @Body() body: { packageCode: string }) {
    if (!body?.packageCode) {
      throw new BadRequestException('packageCode обязателен');
    }
    return this.ordersService.topupOrder(id, body.packageCode);
  }
}
