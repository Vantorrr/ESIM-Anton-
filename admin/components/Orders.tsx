'use client'

import { useEffect, useState } from 'react'
import { ordersApi } from '@/lib/api'
import { Package } from 'lucide-react'

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadOrders()
  }, [page])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const response = await ordersApi.getAll({ page, limit: 20 })
      
      if (response.data) {
        setOrders(response.data.data || [])
        setTotalPages(response.data.meta?.totalPages || 1)
      }
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700'
      case 'PAID': return 'bg-blue-100 text-blue-700'
      case 'PENDING': return 'bg-yellow-100 text-yellow-700'
      case 'PROCESSING': return 'bg-purple-100 text-purple-700'
      case 'FAILED': return 'bg-red-100 text-red-700'
      case 'CANCELLED': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Выполнен'
      case 'PAID': return 'Оплачен'
      case 'PENDING': return 'Ожидает оплаты'
      case 'PROCESSING': return 'В обработке'
      case 'FAILED': return 'Ошибка'
      case 'CANCELLED': return 'Отменен'
      case 'REFUNDED': return 'Возврат'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Все заказы</h2>
        <button
          onClick={loadOrders}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Обновить
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="text-lg">Пока нет заказов</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Пользователь</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Продукт</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Сумма</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Статус</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Дата</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-slate-100 hover:bg-white/50 transition-colors"
                  >
                    <td className="py-4 px-4 font-mono text-sm">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="py-4 px-4 font-medium">
                      {order.user?.firstName || order.user?.username || 'Пользователь'}
                    </td>
                    <td className="py-4 px-4">
                      {order.product?.name || 'N/A'}
                    </td>
                    <td className="py-4 px-4 font-bold">
                      ₽{Number(order.totalAmount).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-white/50 hover:bg-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Назад
              </button>
              <span className="px-4 py-2 text-sm text-slate-600">
                Страница {page} из {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg bg-white/50 hover:bg-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Вперед
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
