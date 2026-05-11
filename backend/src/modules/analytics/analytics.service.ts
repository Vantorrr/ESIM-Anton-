import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

/** Статистика по продукту */
export interface ProductStat {
  productId: string;
  productName: string;
  country: string;
  count: number;
  revenue: number;
}

/** Статистика по стране */
export interface CountryStat {
  country: string;
  count: number;
  revenue: number;
}

/** Точка графика продаж */
export interface SalesChartPoint {
  date: string;
  count: number;
  revenue: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Построить фильтр по диапазону дат для поля createdAt.
   */
  private buildCreatedAtFilter(dateFrom?: Date, dateTo?: Date) {
    if (!dateFrom && !dateTo) return undefined;
    return {
      ...(dateFrom && { gte: dateFrom }),
      ...(dateTo && { lte: dateTo }),
    };
  }

  /**
   * Общая статистика (дашборд)
   */
  async getDashboard(dateFrom?: Date, dateTo?: Date) {
    const createdAt = this.buildCreatedAtFilter(dateFrom, dateTo);
    const where: Prisma.OrderWhereInput = {
      ...(createdAt && { createdAt }),
    };
    const completedWhere: Prisma.OrderWhereInput = {
      ...where,
      status: 'COMPLETED',
    };
    const userWhere: Prisma.UserWhereInput = {
      ...(createdAt && { createdAt }),
    };

    const [
      totalUsers,
      newUsers,
      totalOrders,
      completedOrders,
      revenueAgg,
      paidAvg,
      promoOrders,
      freeOrders,
      topProducts,
      topCountries,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: userWhere }),
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: completedWhere }),
      // Все суммы за один aggregate
      this.prisma.order.aggregate({
        where: completedWhere,
        _sum: {
          totalAmount: true,
          productPrice: true,
          promoDiscount: true,
          discount: true,
          bonusUsed: true,
        },
      }),
      // Средний чек только по оплаченным (totalAmount > 0)
      this.prisma.order.aggregate({
        where: { ...completedWhere, totalAmount: { gt: 0 } },
        _avg: { totalAmount: true },
      }),
      // Кол-во COMPLETED с промокодом
      this.prisma.order.count({
        where: { ...completedWhere, promoCode: { not: null } },
      }),
      // Кол-во бесплатных COMPLETED (totalAmount = 0)
      this.prisma.order.count({
        where: { ...completedWhere, totalAmount: { equals: 0 } },
      }),
      this.getTopProducts(5, dateFrom, dateTo),
      this.getTopCountries(5, dateFrom, dateTo),
    ]);

    return {
      users: {
        total: totalUsers,
        new: newUsers,
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        withPromo: promoOrders,
        freeOrders,
        conversionRate:
          totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      },
      revenue: {
        total: revenueAgg._sum.totalAmount || 0,
        gross: revenueAgg._sum.productPrice || 0,
        promoDiscounts: revenueAgg._sum.promoDiscount || 0,
        loyaltyDiscounts: revenueAgg._sum.discount || 0,
        bonusesUsed: revenueAgg._sum.bonusUsed || 0,
        average: paidAvg._avg.totalAmount || 0,
      },
      topProducts,
      topCountries,
    };
  }

  /**
   * Топ продуктов — агрегация на стороне БД через groupBy.
   */
  async getTopProducts(
    limit = 10,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<ProductStat[]> {
    const createdAt = this.buildCreatedAtFilter(dateFrom, dateTo);

    const grouped = await this.prisma.order.groupBy({
      by: ['productId'],
      where: { ...(createdAt && { createdAt }), status: 'COMPLETED' },
      _sum: { quantity: true, totalAmount: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    if (grouped.length === 0) return [];

    // Подтягиваем имена продуктов одним запросом
    const productIds = grouped.map((g) => g.productId);
    const products = await this.prisma.esimProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, country: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return grouped.map((g) => {
      const product = productMap.get(g.productId);
      return {
        productId: g.productId,
        productName: product?.name ?? 'Unknown',
        country: product?.country ?? 'Unknown',
        count: g._sum.quantity ?? 0,
        revenue: Number(g._sum.totalAmount ?? 0),
      };
    });
  }

  /**
   * Топ стран — агрегация через Raw SQL (groupBy по связанной таблице
   * не поддерживается в Prisma, поэтому используем $queryRaw).
   */
  async getTopCountries(
    limit = 10,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<CountryStat[]> {
    const conditions = [`o.status = 'COMPLETED'`];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (dateFrom) {
      conditions.push(`o."createdAt" >= $${paramIndex++}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`o."createdAt" <= $${paramIndex++}`);
      params.push(dateTo);
    }

    const whereClause = conditions.join(' AND ');

    const rows = await this.prisma.$queryRawUnsafe<
      { country: string; cnt: bigint; rev: Prisma.Decimal }[]
    >(
      `SELECT p.country, SUM(o.quantity) AS cnt, SUM(o."totalAmount") AS rev
       FROM orders o
       JOIN esim_products p ON p.id = o."productId"
       WHERE ${whereClause}
       GROUP BY p.country
       ORDER BY cnt DESC
       LIMIT ${limit}`,
      ...params,
    );

    return rows.map((r) => ({
      country: r.country,
      count: Number(r.cnt),
      revenue: Number(r.rev),
    }));
  }

  /**
   * График продаж по датам — агрегация через Raw SQL (DATE_TRUNC).
   */
  async getSalesChart(
    dateFrom: Date,
    dateTo: Date,
  ): Promise<SalesChartPoint[]> {
    const rows = await this.prisma.$queryRaw<
      { date: Date; cnt: bigint; rev: Prisma.Decimal }[]
    >(
      Prisma.sql`
        SELECT DATE_TRUNC('day', "createdAt") AS date,
               COUNT(*)                        AS cnt,
               SUM("totalAmount")              AS rev
        FROM orders
        WHERE status = 'COMPLETED'
          AND "createdAt" >= ${dateFrom}
          AND "createdAt" <= ${dateTo}
        GROUP BY 1
        ORDER BY 1
      `,
    );

    return rows.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      count: Number(r.cnt),
      revenue: Number(r.rev),
    }));
  }
}
