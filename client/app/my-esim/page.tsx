'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Smartphone, Plus, Wifi, WifiOff, RefreshCw, QrCode } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { getCountryEmoji, formatDataAmount } from '@/lib/utils'
import { userApi, ordersApi } from '@/lib/api'
import { useAuth } from '@/components/AuthProvider'
import { useSmartBack } from '@/lib/useSmartBack'

interface MyEsim {
  id: string
  iccid: string
  country: string
  dataAmount: string
  usedData: string
  validUntil: string
  status: 'active' | 'expired' | 'pending'
  qrCode?: string
  canTopup: boolean
  activationCode?: string
  // Реальный расход трафика (загружается асинхронно)
  usage?: {
    available: boolean
    reason?: string
    stale?: boolean
    usedBytes: number | null
    totalBytes: number | null
    remainingBytes: number | null
    percent: number | null
  }
  tags?: string[]
  // Идёт ли сейчас загрузка/обновление usage по этой eSIM
  refreshing?: boolean
}

/**
 * Простой пул конкурентных запросов с ограничением числа параллельных задач.
 * Используется для опроса /orders/{id}/usage по списку eSIM, чтобы не открывать
 * сразу 20+ соединений к API/провайдеру и не словить rate limit.
 */
async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<void> {
  const queue = [...tasks]
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift()
      if (!next) return
      try { await next() } catch { /* перехвачено внутри задачи */ }
    }
  })
  await Promise.all(workers)
}

const USAGE_CONCURRENCY = 5

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '—'
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} ГБ`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} МБ`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} КБ`
  return `${bytes} Б`
}

export default function MyEsimPage() {
  const router = useRouter()
  const handleBack = useSmartBack('/profile')
  const { user: authUser, isLoading: authLoading } = useAuth()
  const [esims, setEsims] = useState<MyEsim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    loadEsims()
  }, [authLoading])

  const loadEsims = async () => {
    try {
      let userId: string | null = authUser?.id || null

      if (!userId) {
        const { getToken } = await import('@/lib/auth')
        const token = getToken()
        if (token) {
          const { api } = await import('@/lib/api')
          const { data } = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
          userId = data.id
        } else {
          window.location.href = '/login'
          return
        }
      }

      if (!userId) { setLoading(false); return }
      const orders = await ordersApi.getMy(userId);
      
      // Фильтруем только оплаченные и завершенные заказы
      const activeOrders = orders.filter(o => 
        o.status === 'PAID' || o.status === 'COMPLETED'
      );

      const mappedEsims: MyEsim[] = activeOrders.map(order => ({
        id: order.id,
        iccid: order.iccid || 'Ожидает генерации...',
        country: order.product.country,
        dataAmount: formatDataAmount(order.product.dataAmount),
        usedData: '—',
        validUntil: new Date(new Date(order.createdAt).getTime() + order.product.validityDays * 24 * 60 * 60 * 1000).toLocaleDateString(),
        status: 'active',
        qrCode: order.qrCode,
        activationCode: order.activationCode,
        // Кнопку «Пополнить» скрываем только если провайдер ЯВНО не поддерживает
        // top-up (supportTopup === false). Если поле ещё не известно (undefined,
        // например для тарифов, купленных до раскатки этого изменения) — оставляем
        // кнопку, а недоступность увидим уже на странице топ-апа («пакетов нет»).
        canTopup: order.product.supportTopup !== false,
        tags: order.product.tags,
      }));

      setEsims(mappedEsims);

      // Подгружаем реальный usage параллельно с лимитом — чтобы не открывать сразу
      // 20+ HTTP-запросов и не упереться в rate-limit провайдера.
      const candidates = mappedEsims.filter(
        (e) => e.iccid && !e.iccid.startsWith('Ожидает'),
      )
      const tasks = candidates.map((esim) => () => fetchUsageInto(esim.id))
      await runWithConcurrency(tasks, USAGE_CONCURRENCY)
    } catch (error) {
      console.error('Ошибка загрузки eSIM:', error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Загружает usage для конкретной eSIM и пишет в state.
   * `force=true` принудительно дёргает провайдера, минуя серверный кэш —
   * используется при ручном refresh.
   */
  const fetchUsageInto = async (esimId: string, force = false) => {
    setEsims((prev) =>
      prev.map((e) => (e.id === esimId ? { ...e, refreshing: true } : e)),
    )
    try {
      const u = await ordersApi.getUsage(esimId, force)
      const percent =
        u.totalBytes && u.usedBytes !== null
          ? Math.min(100, Math.round((u.usedBytes / u.totalBytes) * 100))
          : null
      setEsims((prev) =>
        prev.map((e) =>
          e.id === esimId
            ? {
                ...e,
                refreshing: false,
                usedData: u.usedBytes !== null ? formatBytes(u.usedBytes) : '—',
                usage: { ...u, percent },
              }
            : e,
        ),
      )
    } catch (err) {
      console.warn('Не удалось получить usage для', esimId, err)
      setEsims((prev) =>
        prev.map((e) => (e.id === esimId ? { ...e, refreshing: false } : e)),
      )
    }
  }

  const refreshUsage = (esimId: string) => fetchUsageInto(esimId, true)

  const getStatusConfig = (status: MyEsim['status']) => {
    const configs = {
      active: { 
        label: 'Активен', 
        icon: Wifi, 
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30'
      },
      expired: { 
        label: 'Истёк', 
        icon: WifiOff, 
        color: 'text-gray-500',
        bg: 'bg-gray-100 dark:bg-gray-700'
      },
      pending: { 
        label: 'Ожидает активации', 
        icon: RefreshCw, 
        color: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-100 dark:bg-yellow-900/30'
      },
    }
    return configs[status]
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold text-lg text-gray-900 dark:text-white">Мои eSIM</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  <div className="skeleton w-14 h-14 rounded-xl" />
                  <div className="flex-1">
                    <div className="skeleton h-5 w-24 mb-2" />
                    <div className="skeleton h-4 w-32" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : esims.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-6">
              <Smartphone className="text-gray-400" size={48} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Нет активных eSIM
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Купите ваш первый eSIM и он появится здесь
            </p>
            <Link href="/">
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-[#f77430] hover:bg-[#f2622a] text-white font-medium rounded-xl transition-colors">
                <Plus size={20} />
                Купить eSIM
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {esims.map((esim) => {
              const statusConfig = getStatusConfig(esim.status)
              const StatusIcon = statusConfig.icon
              
              return (
                <div 
                  key={esim.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    {/* Country Flag */}
                    <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-3xl">
                      {getCountryEmoji(esim.country)}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {esim.country}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {esim.dataAmount}
                      </p>
                      
                      {/* Status */}
                      <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.bg}`}>
                        <StatusIcon size={14} />
                        {statusConfig.label}
                      </div>
                    </div>
                  </div>
                  
                  {/* Теги */}
                  {esim.tags && esim.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {esim.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Data Usage */}
                  {esim.status === 'active' && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      {esim.usage?.available && esim.usage.percent !== null ? (
                        <>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-500 dark:text-gray-400">
                              Использовано
                              {esim.usage.stale && (
                                <span className="ml-1 text-amber-600 dark:text-amber-400" title="Данные могут быть устаревшими">
                                  (устар.)
                                </span>
                              )}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white inline-flex items-center gap-2">
                              {formatBytes(esim.usage.usedBytes)} / {formatBytes(esim.usage.totalBytes)}
                              <button
                                type="button"
                                onClick={() => refreshUsage(esim.id)}
                                disabled={esim.refreshing}
                                aria-label="Обновить расход"
                                className="text-gray-400 hover:text-[#f77430] disabled:opacity-50 transition-colors"
                              >
                                <RefreshCw size={14} className={esim.refreshing ? 'animate-spin' : ''} />
                              </button>
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                esim.usage.percent >= 90 ? 'bg-red-500'
                                  : esim.usage.percent >= 70 ? 'bg-amber-500'
                                  : 'bg-[#f77430]'
                              }`}
                              style={{ width: `${esim.usage.percent}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {esim.usage?.reason || 'Расход обновляется...'}
                          </p>
                          <button
                            type="button"
                            onClick={() => refreshUsage(esim.id)}
                            disabled={esim.refreshing}
                            aria-label="Обновить расход"
                            className="text-gray-400 hover:text-[#f77430] disabled:opacity-50 transition-colors"
                          >
                            <RefreshCw size={14} className={esim.refreshing ? 'animate-spin' : ''} />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        Действует до {esim.validUntil}
                      </p>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    {esim.qrCode && (
                      <button 
                        onClick={() => router.push(`/order/${esim.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium text-sm"
                      >
                        <QrCode size={18} />
                        QR-код
                      </button>
                    )}
                    {esim.canTopup && esim.status === 'active' && (
                      <button
                        onClick={() => router.push(`/topup/${esim.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f77430] hover:bg-[#f2622a] text-white rounded-xl font-medium text-sm transition-colors"
                      >
                        <RefreshCw size={18} />
                        Пополнить
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            
            {/* Add More */}
            <Link href="/">
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-[#f77430] hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors cursor-pointer">
                <Plus className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="font-medium text-gray-600 dark:text-gray-300">Добавить eSIM</p>
              </div>
            </Link>
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
