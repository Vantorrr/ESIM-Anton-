import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Общая статистика (дашборд)
   */
  async getDashboard(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // Параллельные запросы
    const [
      totalUsers,
      newUsers,
      totalOrders,
      completedOrders,
      totalRevenue,
      averageOrderValue,
      topProducts,
      topCountries,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where }),
      this.prisma.order.count({ where }),
      this.prisma.order.count({
        where: {
          ...where,
          status: 'COMPLETED',
        },
      }),
      this.prisma.order.aggregate({
        where: {
          ...where,
          status: 'COMPLETED',
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          ...where,
          status: 'COMPLETED',
        },
        _avg: { totalAmount: true },
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
        conversionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      },
      revenue: {
        total: totalRevenue._sum.totalAmount || 0,
        average: averageOrderValue._avg.totalAmount || 0,
      },
      topProducts,
      topCountries,
    };
  }

  /**
   * Топ продуктов
   */
  async getTopProducts(limit = 10, dateFrom?: Date, dateTo?: Date) {
    const where: any = { status: 'COMPLETED' };
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        product: true,
      },
    });

    // Группируем по продукту
    const productStats = orders.reduce((acc, order) => {
      const productId = order.product.id;
      
      if (!acc[productId]) {
        acc[productId] = {
          product: order.product,
          count: 0,
          revenue: 0,
        };
      }
      
      acc[productId].count += order.quantity;
      acc[productId].revenue += Number(order.totalAmount);
      
      return acc;
    }, {});

    return Object.values(productStats)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Топ стран
   */
  async getTopCountries(limit = 10, dateFrom?: Date, dateTo?: Date) {
    const where: any = { status: 'COMPLETED' };
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        product: true,
      },
    });

    // Группируем по стране
    const countryStats = orders.reduce((acc, order) => {
      const country = order.product.country;
      
      if (!acc[country]) {
        acc[country] = {
          country,
          count: 0,
          revenue: 0,
        };
      }
      
      acc[country].count += order.quantity;
      acc[country].revenue += Number(order.totalAmount);
      
      return acc;
    }, {});

    return Object.values(countryStats)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * График продаж по датам
   */
  async getSalesChart(dateFrom: Date, dateTo: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    // Группируем по датам
    const dateStats = orders.reduce((acc, order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = {
          date,
          count: 0,
          revenue: 0,
        };
      }
      
      acc[date].count += 1;
      acc[date].revenue += Number(order.totalAmount);
      
      return acc;
    }, {});

    return Object.values(dateStats).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }
}
