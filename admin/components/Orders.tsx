'use client'

import { useEffect, useState, useCallback } from 'react'
import { ordersApi } from '@/lib/api'
import { Package, Download } from 'lucide-react'

// -- Helpers ----------------------------------------------------------

const fmtPrice = (v: unknown): string =>
  `₽${Number(v || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}`

const hasDiscount = (order: any): boolean =>
  Number(order.promoDiscount || 0) > 0 ||
  Number(order.discount || 0) > 0 ||
  Number(order.bonusUsed || 0) > 0

const CANCELLABLE = new Set(['PENDING', 'FAILED'])

type SortField = 'createdAt' | 'totalAmount' | 'productPrice' | 'status'

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'PENDING', label: 'Ожидает оплаты' },
  { value: 'PAID', label: 'Оплачен' },
  { value: 'PROCESSING', label: 'В обработке' },
  { value: 'COMPLETED', label: 'Выполнен' },
  { value: 'FAILED', label: 'Ошибка' },
  { value: 'CANCELLED', label: 'Отменен' },
  { value: 'REFUNDED', label: 'Возврат' },
] as const

const STATUS_TEXT: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.filter(o => o.value).map(o => [o.value, o.label]),
)

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  PAID: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-purple-100 text-purple-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
}

// -- CSV Export --------------------------------------------------------

function exportOrdersCsv(orders: any[]) {
  const headers = [
    'ID', 'Пользователь', 'Продукт', 'Страна',
    'Цена', 'Промокод', 'Скидка промокод', 'Скидка лояльность',
    'Бонусы', 'Итого оплачено', 'Статус', 'Дата',
  ]

  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

  const rows = orders.map((o: any) => [
    o.id,
    o.user?.firstName || o.user?.username || '',
    o.product?.name || '',
    o.product?.country || '',
    Number(o.productPrice || 0),
    o.promoCode || '',
    Number(o.promoDiscount || 0),
    Number(o.discount || 0),
    Number(o.bonusUsed || 0),
    Number(o.totalAmount || 0),
    STATUS_TEXT[o.status] || o.status,
    new Date(o.createdAt).toLocaleDateString('ru-RU'),
  ])

  // Semicolon delimiter for Russian Excel locale, UTF-8 BOM
  const csv = [headers, ...rows]
    .map(row => row.map(escape).join(';'))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// -- Component --------------------------------------------------------

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [exporting, setExporting] = useState(false)

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, unknown> = { page, limit: 20, sortBy, sortOrder }
      if (statusFilter) params.status = statusFilter
      const response = await ordersApi.getAll(params)
      if (response.data) {
        setOrders(response.data.data || [])
        setTotalPages(response.data.meta?.totalPages || 1)
        setTotalCount(response.data.meta?.total || 0)
      }
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, sortBy, sortOrder])

  useEffect(() => { loadOrders() }, [loadOrders])

  // -- Handlers -------------------------------------------------------

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const handleCancel = async (orderId: string) => {
    if (!confirm('Отменить заказ? Это действие необратимо.')) return
    try {
      await ordersApi.cancel(orderId)
      loadOrders()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Ошибка отмены заказа')
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const params: Record<string, unknown> = { page: 1, limit: 10000, sortBy, sortOrder }
      if (statusFilter) params.status = statusFilter
      const response = await ordersApi.getAll(params)
      exportOrdersCsv(response.data?.data || [])
    } catch (error) {
      console.error('Ошибка экспорта:', error)
      alert('Не удалось экспортировать заказы')
    } finally {
      setExporting(false)
    }
  }

  // -- Sort header helper ---------------------------------------------

  const SortTh = ({ field, children }: { field: SortField; children: string }) => {
    const active = sortBy === field
    return (
      <th
        onClick={() => handleSort(field)}
        className="text-left py-3 px-4 font-semibold text-slate-700 cursor-pointer select-none hover:text-blue-600 transition-colors"
      >
        {children}
        {active
          ? <span className="ml-1 text-blue-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          : <span className="ml-1 text-slate-300">↕</span>
        }
      </th>
    )
  }

  // -- Render ---------------------------------------------------------

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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold">
          Все заказы
          <span className="ml-2 text-base font-normal text-slate-500">({totalCount})</span>
        </h2>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={e => handleStatusChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <button
            onClick={handleExport}
            disabled={exporting || orders.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Экспорт…' : 'Excel'}
          </button>

          <button
            onClick={loadOrders}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Обновить
          </button>
        </div>
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
                  <SortTh field="productPrice">Цена</SortTh>
                  <SortTh field="status">Статус</SortTh>
                  <SortTh field="createdAt">Дата</SortTh>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const discounted = hasDiscount(order)
                  const promoAmt = Number(order.promoDiscount || 0)
                  const loyaltyAmt = Number(order.discount || 0)
                  const bonusAmt = Number(order.bonusUsed || 0)

                  return (
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
                      <td className="py-4 px-4">
                        {discounted ? (
                          <div className="text-sm space-y-0.5">
                            <div className="text-slate-400 line-through">
                              {fmtPrice(order.productPrice)}
                            </div>
                            {promoAmt > 0 && (
                              <div className="text-orange-600">
                                −{fmtPrice(promoAmt)}{' '}
                                {order.promoCode && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 text-xs font-medium">
                                    {order.promoCode}
                                  </span>
                                )}
                              </div>
                            )}
                            {loyaltyAmt > 0 && (
                              <div className="text-purple-600">
                                −{fmtPrice(loyaltyAmt)} лояльность
                              </div>
                            )}
                            {bonusAmt > 0 && (
                              <div className="text-green-600">
                                −{fmtPrice(bonusAmt)} бонусы
                              </div>
                            )}
                            <div className="font-bold text-slate-900 pt-0.5 border-t border-slate-200">
                              {fmtPrice(order.totalAmount)}
                            </div>
                          </div>
                        ) : (
                          <span className="font-bold">
                            {fmtPrice(order.totalAmount)}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[order.status] || 'bg-gray-100 text-gray-700'}`}>
                          {STATUS_TEXT[order.status] || order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="py-4 px-4">
                        {CANCELLABLE.has(order.status) && (
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                          >
                            Отменить
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
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
