'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Calendar, CheckCircle, Clock, XCircle, QrCode } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { ordersApi, Order, userApi } from '@/lib/api'

function useTelegramUser() {
  const [tgUser, setTgUser] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const user = window.Telegram.WebApp.initDataUnsafe?.user
      setTgUser(user)
    }
  }, [])

  return tgUser
}

function getStatusBadge(status: Order['status']) {
  const badges = {
    PENDING: { label: 'Ожидает оплаты', class: 'badge-warning' },
    PAID: { label: 'Оплачен', class: 'badge-info' },
    PROCESSING: { label: 'Обработка', class: 'badge-info' },
    COMPLETED: { label: 'Выполнен', class: 'badge-success' },
    FAILED: { label: 'Ошибка', class: 'badge-error' },
    REFUNDED: { label: 'Возврат', class: 'badge-warning' },
    CANCELLED: { label: 'Отменён', class: 'badge-error' },
  }
  
  return badges[status] || { label: status, class: 'badge-info' }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const tgUser = useTelegramUser()

  useEffect(() => {
    if (tgUser?.id) {
      initUser()
    }
  }, [tgUser])

  const initUser = async () => {
    try {
      const user = await userApi.getMe(tgUser.id.toString())
      setUserId(user.id)
      await loadOrders(user.id)
    } catch (error) {
      console.error('Ошибка инициализации:', error)
      setLoading(false)
    }
  }

  const loadOrders = async (uid: string) => {
    try {
      const data = await ordersApi.getMy(uid)
      setOrders(data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
      setLoading(false)
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <h1 className="text-2xl font-bold mb-6 mt-6">Мои заказы</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="tg-card">
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
      <header className="mb-6 mt-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Мои заказы</h1>
        <p className="tg-hint">История покупок eSIM</p>
      </header>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="tg-card text-center py-12">
          <Package className="mx-auto mb-4 tg-hint" size={48} />
          <p className="tg-hint text-lg mb-2">У вас пока нет заказов</p>
          <p className="tg-hint text-sm mb-6">Перейдите в каталог, чтобы выбрать eSIM</p>
          <Link href="/">
            <button className="tg-button max-w-xs mx-auto">
              Перейти в каталог
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3 animate-slide-up pb-20">
          {orders.map((order) => {
            const badge = getStatusBadge(order.status)
            const isCompleted = order.status === 'COMPLETED'
            
            return (
              <Link key={order.id} href={`/order/${order.id}`}>
                <div className="tg-card hover:opacity-90 transition-opacity cursor-pointer">
                  {/* Status Badge */}
                  <div className="flex justify-between items-start mb-3">
                    <span className={`badge ${badge.class}`}>{badge.label}</span>
                    <span className="tg-hint text-xs">
                      <Calendar size={14} className="inline mr-1" />
                      {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Product Info */}
                  <h3 className="font-bold text-lg mb-1">{order.product.country}</h3>
                  <p className="text-sm mb-2">{order.product.name}</p>
                  
                  <div className="flex gap-3 text-sm tg-hint mb-3">
                    <span>📊 {order.product.dataAmount}</span>
                    <span>📅 {order.product.validityDays} дней</span>
                    {order.quantity > 1 && <span>× {order.quantity}</span>}
                  </div>

                  {/* Price */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="tg-hint">Сумма</span>
                    <span className="font-bold text-lg" style={{ color: 'var(--tg-theme-button-color)' }}>
                      ₽{Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>

                  {/* QR Code indicator */}
                  {isCompleted && order.qrCode && (
                    <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--tg-theme-button-color)' }}>
                      <QrCode size={16} />
                      <span className="font-medium">QR-код доступен</span>
                    </div>
                  )}
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
