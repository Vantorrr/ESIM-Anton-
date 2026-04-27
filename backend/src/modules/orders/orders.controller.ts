import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';
import { JwtUserGuard, CurrentUser, AuthUser } from '@/common/auth/jwt-user.guard';

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

  /**
   * Расход трафика по eSIM (с кэшированием).
   * Защищено: только владелец заказа.
   *
   * `?force=true` — принудительно перезапросить у провайдера, минуя кэш.
   */
  @Get(':id/usage')
  @UseGuards(JwtUserGuard)
  @ApiOperation({ summary: 'Расход трафика по eSIM (с кэшированием)' })
  async getUsage(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Query('force') force?: string,
  ) {
    await this.ordersService.assertOwnership(id, user.id);
    const usage = await this.ordersService.getOrderUsage(
      id,
      undefined,
      force === 'true',
    );

    const toNum = (v: number | null | undefined) =>
      v === null || v === undefined ? null : Number(v);

    return {
      available: usage.available,
      reason: 'reason' in usage ? usage.reason : undefined,
      stale: 'stale' in usage ? usage.stale : false,
      usedBytes: toNum(usage.usedBytes),
      totalBytes: toNum(usage.totalBytes),
      remainingBytes: toNum(usage.remainingBytes),
      updatedAt: usage.updatedAt,
    };
  }

  /**
   * Список пакетов пополнения для eSIM (включая цену в RUB).
   * Защищено: только владелец заказа.
   */
  @Get(':id/topup-packages')
  @UseGuards(JwtUserGuard)
  @ApiOperation({ summary: 'Список пакетов пополнения для eSIM (с ценой в RUB)' })
  async getTopupPackages(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.ordersService.assertOwnership(id, user.id);
    return this.ordersService.getTopupPackagesForOrder(id);
  }

  /**
   * Запустить пополнение eSIM выбранным пакетом.
   *
   * Поведение:
   *  - paymentMethod = "balance" (по умолчанию): атомарно списываем с баланса
   *    пользователя и сразу выполняем top-up через провайдера. При ошибке провайдера —
   *    автоматический возврат на баланс.
   *  - paymentMethod = "card": создаётся заказ-пополнение в статусе PENDING и
   *    тут же создаётся платёж через Robokassa. Возвращается paymentUrl.
   *
   * Защищено: только владелец родительского заказа.
   */
  @Post(':id/topup')
  @UseGuards(JwtUserGuard)
  @ApiOperation({ summary: 'Пополнить eSIM (списание с баланса или оплата картой)' })
  async topup(
    @Param('id') parentId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: { packageCode: string; paymentMethod?: 'balance' | 'card' },
  ) {
    if (!body?.packageCode) {
      throw new BadRequestException('packageCode обязателен');
    }
    const method = body.paymentMethod === 'balance' ? 'balance' : 'card';

    const result = await this.ordersService.createTopupOrder(
      parentId,
      body.packageCode,
      user.id,
      method,
    );

    // Для card-flow клиент должен сам вызвать POST /payments/create с order.id
    // (это разрывает цикл OrdersModule ↔ PaymentsModule на уровне TS-импортов)
    return {
      method: result.paymentMethod,
      order: result.order,
    };
  }
}
