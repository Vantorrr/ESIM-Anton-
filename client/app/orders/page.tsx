'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Clock, CheckCircle, XCircle, AlertCircle, ChevronRight, ShoppingBag } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

interface Order {
  id: string
  product: {
    country: string
    name: string
    dataAmount: string
  }
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED'
  totalAmount: number
  createdAt: string
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    // Демо-заказы для отображения
    // TODO: Подключить реальный API
    setOrders([])
    setLoading(false)
  }

  const getStatusConfig = (status: Order['status']) => {
    const configs = {
      PENDING: { label: 'Ожидает оплаты', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-50' },
      PAID: { label: 'Оплачен', icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
      PROCESSING: { label: 'Обработка', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
      COMPLETED: { label: 'Выполнен', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
      FAILED: { label: 'Ошибка', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
      REFUNDED: { label: 'Возврат', icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
      CANCELLED: { label: 'Отменён', icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-50' },
    }
    return configs[status]
  }

  const getCountryEmoji = (country: string): string => {
    const flags: Record<string, string> = {
      'США': '🇺🇸',
      'Европа': '🇪🇺',
      'Турция': '🇹🇷',
      'ОАЭ': '🇦🇪',
      'Таиланд': '🇹🇭',
      'Япония': '🇯🇵',
    }
    return flags[country] || '🌍'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="container">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Мои заказы</h1>
        </header>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card">
              <div className="skeleton h-6 w-32 mb-2" />
              <div className="skeleton h-4 w-full mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-primary">Мои заказы</h1>
        <p className="text-secondary text-sm mt-1">История ваших покупок</p>
      </header>

      {orders.length === 0 ? (
        <div className="glass-card text-center py-16 animate-slide-up">
          <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="text-muted" size={40} />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-2">Нет заказов</h3>
          <p className="text-muted text-sm mb-6">
            Вы ещё не совершали покупок
          </p>
          <Link href="/">
            <button className="glass-button" style={{ width: 'auto', padding: '12px 32px' }}>
              Перейти в каталог
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order, index) => {
            const statusConfig = getStatusConfig(order.status)
            const StatusIcon = statusConfig.icon
            
            return (
              <Link key={order.id} href={`/order/${order.id}`}>
                <div 
                  className="glass-card animate-slide-up cursor-pointer"
                  style={{ animationDelay: `${0.05 * (index + 1)}s` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Country Flag */}
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl shrink-0">
                      {getCountryEmoji(order.product.country)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-primary truncate">
                          {order.product.country}
                        </h3>
                        <p className="font-bold text-accent shrink-0">₽{order.totalAmount}</p>
                      </div>
                      <p className="text-sm text-secondary">{order.product.name}</p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className={`flex items-center gap-1 text-xs ${statusConfig.color}`}>
                          <StatusIcon size={14} />
                          <span>{statusConfig.label}</span>
                        </div>
                        <p className="text-xs text-muted">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>

                    <ChevronRight className="text-muted shrink-0" size={18} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
