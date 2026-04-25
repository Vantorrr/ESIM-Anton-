'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, RefreshCw, Wifi, AlertCircle, CheckCircle2 } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { ordersApi, type TopupPackage, type Order } from '@/lib/api'
import { useSmartBack } from '@/lib/useSmartBack'

function formatVolume(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} ГБ`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} МБ`
  return `${bytes} Б`
}

export default function TopupPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = String(params?.orderId || '')
  const handleBack = useSmartBack('/my-esim')

  const [order, setOrder] = useState<Order | null>(null)
  const [packages, setPackages] = useState<TopupPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    void loadData()
  }, [orderId])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const o = await ordersApi.getById(orderId)
      setOrder(o)

      if (!o.iccid) {
        setError('eSIM ещё не выдана — пополнение пока недоступно')
        return
      }

      const pkgs = await ordersApi.getTopupPackages(orderId)
      setPackages(pkgs.filter((p) => p.supportTopup !== false))
    } catch (e: any) {
      setError(
        e.response?.data?.message ||
          e.message ||
          'Не удалось загрузить пакеты пополнения'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleTopup = async (pkg: TopupPackage) => {
    if (!confirm(`Подтвердите пополнение пакетом «${pkg.name}»`)) return
    setSubmitting(pkg.packageCode)
    setError(null)
    setSuccess(null)
    try {
      await ordersApi.topup(orderId, pkg.packageCode)
      setSuccess(`✅ eSIM пополнена пакетом «${pkg.name}»`)
      setTimeout(() => router.push('/my-esim'), 1500)
    } catch (e: any) {
      setError(
        e.response?.data?.message || e.message || 'Не удалось выполнить пополнение'
      )
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={handleBack} className="p-2 -ml-2 text-gray-600 dark:text-gray-300">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-semibold text-lg text-gray-900 dark:text-white">
            Пополнение трафика
          </h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {order && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Wifi className="text-[#f77430]" size={24} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {order.product.country} — {order.product.dataAmount}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  ICCID: {order.iccid || '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" size={20} />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircle2 className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" size={20} />
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4">
                <div className="skeleton h-5 w-32 mb-2" />
                <div className="skeleton h-4 w-48" />
              </div>
            ))}
          </div>
        ) : packages.length === 0 && !error ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Для этой eSIM пополнение недоступно у провайдера.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {packages.map((pkg) => {
              const priceUsd = pkg.price / 10000
              return (
                <div
                  key={pkg.packageCode}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {pkg.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {formatVolume(pkg.volume)} · {pkg.duration} {pkg.durationUnit || 'дн'}
                        {pkg.speed ? ` · ${pkg.speed}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900 dark:text-white">
                        ${priceUsd.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTopup(pkg)}
                    disabled={submitting !== null}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f77430] hover:bg-[#f2622a] text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {submitting === pkg.packageCode ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        Пополнить
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-4">
          Списание с баланса Mojo mobile или оплата картой подключаются на следующем шаге.
        </p>
      </div>

      <BottomNav />
    </div>
  )
}
