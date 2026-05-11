'use client'

import { useEffect, useState } from 'react'
import { Users, Package, CreditCard, TrendingUp } from 'lucide-react'
import { analyticsApi, ordersApi } from '@/lib/api'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { isUnauthorizedError } from '@/lib/auth'
import type { AdminOrder, DashboardStats } from '@/lib/types'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [statsRes, ordersRes] = await Promise.all([
        analyticsApi.getDashboard(),
        ordersApi.getAll({ limit: 5 }),
      ])

      setStats(statsRes.data)
      setRecentOrders(ordersRes.data?.data || [])
    } catch (error) {
      if (isUnauthorizedError(error)) return
      console.error('Ошибка загрузки данных:', error)
      setError('Не удалось загрузить данные дашборда')
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    {
      title: 'Всего пользователей',
      value: Number(stats?.users.total || 0).toLocaleString(),
      change: `+${stats?.users.new || 0}`,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Заказы (всего)',
      value: Number(stats?.orders.total || 0).toLocaleString(),
      change: `${stats?.orders.completed || 0} выполнено`,
      icon: Package,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Выручка (всего)',
      value: `₽${Number(stats?.revenue.total || 0).toLocaleString()}`,
      change: `Средний чек: ₽${Number(stats?.revenue.average || 0).toFixed(0)}`,
      icon: CreditCard,
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Конверсия',
      value: `${Number(stats?.orders.conversionRate || 0).toFixed(1)}%`,
      change: 'Завершенные заказы',
      icon: TrendingUp,
      color: 'from-orange-500 to-red-500',
    },
  ]

  if (loading) {
    return (
      <Spinner centered />
    )
  }

  if (error) {
    return (
      <div className="glass-card glass-card--static p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Не удалось загрузить дашборд</h2>
        <p className="mt-2 text-slate-600">{error}</p>
        <div className="mt-6 flex justify-center">
          <Button onClick={loadData}>Повторить</Button>
        </div>
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
            <Button onClick={loadData} variant="ghost" size="sm" className="px-0 text-blue-600 hover:bg-transparent hover:text-blue-700">
              Обновить
            </Button>
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
