'use client'

import { useEffect, useState } from 'react'
import { Users, Package, CreditCard, TrendingUp } from 'lucide-react'
import { analyticsApi, ordersApi, usersApi } from '@/lib/api'

interface DashboardStats {
  users: {
    total: number
    new: number
  }
  orders: {
    total: number
    completed: number
    conversionRate: number
  }
  revenue: {
    total: number
    average: number
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Загружаем статистику и последние заказы параллельно
      const [statsRes, ordersRes] = await Promise.all([
        analyticsApi.getDashboard().catch(() => null),
        ordersApi.getAll({ limit: 5 }).catch(() => ({ data: [] })),
      ])

      if (statsRes?.data) {
        setStats(statsRes.data)
      }

      if (ordersRes?.data?.data) {
        setRecentOrders(ordersRes.data.data)
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  // Моковые данные как fallback
  const displayStats = stats || {
    users: { total: 0, new: 0 },
    orders: { total: 0, completed: 0, conversionRate: 0 },
    revenue: { total: 0, average: 0 },
  }

  const statsCards = [
    {
      title: 'Всего пользователей',
      value: Number(displayStats.users.total || 0).toLocaleString(),
      change: `+${displayStats.users.new || 0}`,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Заказы (всего)',
      value: Number(displayStats.orders.total || 0).toLocaleString(),
      change: `${displayStats.orders.completed || 0} выполнено`,
      icon: Package,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Выручка (всего)',
      value: `₽${Number(displayStats.revenue.total || 0).toLocaleString()}`,
      change: `Средний чек: ₽${Number(displayStats.revenue.average || 0).toFixed(0)}`,
      icon: CreditCard,
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Конверсия',
      value: `${Number(displayStats.orders.conversionRate || 0).toFixed(1)}%`,
      change: 'Завершенные заказы',
      icon: TrendingUp,
      color: 'from-orange-500 to-red-500',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.title}
              className="glass-card p-6 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                  <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
                  <p className="text-sm text-green-600 mt-2 font-medium">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Последние заказы */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Последние заказы</h2>
          {recentOrders.length > 0 && (
            <button
              onClick={loadData}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Обновить
            </button>
          )}
        </div>
        
        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>Пока нет заказов</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order, i) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/50 hover:bg-white/70 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium">{order.product?.name || 'Продукт'}</p>
                    <p className="text-sm text-slate-600">
                      {order.user?.firstName || order.user?.username || `ID #${order.userId.slice(0, 8)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">₽{Number(order.totalAmount).toLocaleString()}</p>
                  <p className={`text-sm ${
                    order.status === 'COMPLETED' ? 'text-green-600' :
                    order.status === 'PAID' ? 'text-blue-600' :
                    order.status === 'PENDING' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {order.status === 'COMPLETED' ? 'Выполнен' :
                     order.status === 'PAID' ? 'Оплачен' :
                     order.status === 'PENDING' ? 'Ожидает оплаты' :
                     order.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
