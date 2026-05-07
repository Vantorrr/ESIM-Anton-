'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
// Lucide icons removed due to type issues - using emoji instead
import BottomNav from '@/components/BottomNav'
import { useSmartBack } from '@/lib/useSmartBack'
import { useAuth } from '@/components/AuthProvider'
import { api, paymentsApi } from '@/lib/api'
import { payCloudPayments } from '@/lib/cloudpayments'

interface Transaction {
  id: string
  type: 'deposit' | 'purchase' | 'refund' | 'bonus'
  amount: number
  description: string
  date: string
}

// Маппинг типа транзакции из бэка (TransactionType) в типы для UI
function mapTxType(type: string, amount: number): Transaction['type'] {
  switch (type) {
    case 'PAYMENT': return 'purchase'
    case 'REFUND': return 'refund'
    case 'BONUS_ACCRUAL':
    case 'REFERRAL_BONUS': return 'bonus'
    case 'BONUS_SPENT': return 'purchase'
    default: return amount >= 0 ? 'deposit' : 'purchase'
  }
}

function describeTxType(type: string): string {
  switch (type) {
    case 'PAYMENT': return 'Оплата заказа'
    case 'REFUND': return 'Возврат'
    case 'BONUS_ACCRUAL': return 'Начисление бонусов'
    case 'BONUS_SPENT': return 'Списание бонусов'
    case 'REFERRAL_BONUS': return 'Реферальный бонус'
    default: return type
  }
}

/**
 * Next.js 14 prerender падает на `useSearchParams()` без Suspense-обёртки.
 * Поэтому сама страница — тонкая обёртка с Suspense, вся клиентская логика
 * вынесена в `BalancePageInner`.
 */
export default function BalancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900" />}>
      <BalancePageInner />
    </Suspense>
  )
}

function BalancePageInner() {
  const { user: authUser, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [balance, setBalance] = useState(0)
  const [bonusBalance, setBonusBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [topupOpen, setTopupOpen] = useState(false)
  const [topupAmount, setTopupAmount] = useState('500')
  const [topupSubmitting, setTopupSubmitting] = useState(false)
  const handleBack = useSmartBack('/profile')

  // Когда нас прислали с продукта/тарифа в формате ?topup=NN&returnTo=...,
  // запоминаем returnTo чтобы после успешного пополнения вернуться обратно
  // и (при наличии autoBuy=1 в returnTo) автоматически докупить тариф.
  const returnTo = searchParams.get('returnTo')
  const requestedTopup = searchParams.get('topup')
  const autoOpenedRef = useRef(false)

  useEffect(() => {
    if (authLoading) return
    void loadData()
  }, [authLoading, authUser?.id])

  // Авто-открытие формы топапа при заходе с ?topup=NN — один раз за сессию.
  useEffect(() => {
    if (autoOpenedRef.current) return
    if (!requestedTopup) return
    const n = Number(requestedTopup)
    if (!Number.isFinite(n) || n <= 0) return
    autoOpenedRef.current = true
    // Округляем до сотен в большую сторону, минимум 100 ₽
    const rounded = Math.max(100, Math.ceil(n / 100) * 100)
    setTopupAmount(String(rounded))
    setTopupOpen(true)
  }, [requestedTopup])

  const loadData = async () => {
    setLoading(true)
    try {
      let userId: string | null = authUser?.id || null

      if (!userId) {
        const { getToken } = await import('@/lib/auth')
        const token = getToken()
        if (token) {
          const { data } = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          userId = data.id
        }
      }

      if (!userId) {
        setLoading(false)
        return
      }

      const profileRes = await api.get(`/users/${userId}`)
      const profile = profileRes.data
      setBalance(Number(profile.balance) || 0)
      setBonusBalance(Number(profile.bonusBalance) || 0)

      // Подгружаем историю транзакций (если эндпоинта нет — просто пустой список)
      try {
        const txRes = await api.get(`/payments/user/${userId}`)
        const list = Array.isArray(txRes.data) ? txRes.data : txRes.data?.data || []
        setTransactions(
          list.map((t: any) => {
            const amount = Number(t.amount) || 0
            const signedAmount =
              t.type === 'REFUND' || t.type === 'BONUS_ACCRUAL' || t.type === 'REFERRAL_BONUS'
                ? amount
                : -amount
            return {
              id: t.id,
              type: mapTxType(t.type, signedAmount),
              amount: signedAmount,
              description: describeTxType(t.type),
              date: new Date(t.createdAt).toLocaleString('ru-RU'),
            }
          })
        )
      } catch {
        setTransactions([])
      }
    } catch (e) {
      console.error('Не удалось загрузить баланс:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleTopupSubmit = async () => {
    const amount = Number(topupAmount)
    if (!Number.isFinite(amount) || amount < 100) {
      alert('Минимальная сумма пополнения — 100 ₽')
      return
    }

    setTopupSubmitting(true)
    try {
      // 1) Готовим pending-Transaction в БД и получаем invoiceId для виджета.
      const prep = await paymentsApi.prepareCloudPaymentsBalanceTopup(amount)

      // 2) Открываем CloudPayments-виджет. После успешной оплаты CloudPayments
      // дёрнет наш `cloudpayments/pay` webhook, который атомарно поднимет баланс.
      const result = await payCloudPayments({
        publicId: prep.publicId,
        description: prep.description,
        amount: prep.amount,
        currency: prep.currency,
        invoiceId: prep.invoiceId,
        accountId: prep.accountId,
        data: prep.data,
      })

      if (!result.success) {
        throw new Error(result.reason || 'Платёж не был завершён')
      }

      // 3) Закрываем форму и обновляем баланс/историю.
      setTopupOpen(false)
      setTopupAmount('')
      // Маленькая пауза, чтобы webhook успел зачислить баланс
      setTimeout(() => {
        void loadData()
      }, 1500)

      // 4) Если нас прислали из карточки тарифа (returnTo) — возвращаем туда
      // через небольшую задержку, чтобы успел отобразиться обновлённый баланс
      // и autoBuy=1 на product-странице сработал на свежих данных.
      if (returnTo) {
        setTimeout(() => {
          router.push(returnTo)
        }, 1800)
      }
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Не удалось создать платёж'
      alert(`❌ ${msg}`)
    } finally {
      setTopupSubmitting(false)
    }
  }

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': return <span className="text-lg">💰</span>
      case 'purchase': return <span className="text-lg">💳</span>
      case 'refund': return <span className="text-lg">↩️</span>
      case 'bonus': return <span className="text-lg">🎁</span>
    }
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
            <span className="text-xl">←</span>
          </button>
          <h1 className="font-semibold text-lg text-gray-900 dark:text-white">Баланс</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto">
        
        {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white">
            <p className="text-sm opacity-80 mb-1">Основной баланс</p>
            <p className="text-3xl font-bold">₽ {balance}</p>
          </div>
          <div className="bg-gradient-to-br from-[#f77430] to-[#f29b41] rounded-2xl p-5 text-white">
            <p className="text-sm opacity-80 mb-1">Бонусы</p>
            <p className="text-3xl font-bold">₽ {bonusBalance}</p>
          </div>
        </div>

        {/* Top Up Button */}
        <button
          onClick={() => setTopupOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#f77430] hover:bg-[#f2622a] text-white font-semibold rounded-2xl transition-colors mb-8 shadow-lg shadow-orange-500/30"
        >
          <span className="text-xl">➕</span>
          Пополнить баланс
        </button>

        {topupOpen && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto my-auto">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Пополнение баланса
              </h2>
              <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                Сумма, ₽
              </label>
              <input
                type="number"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                min={100}
                step={100}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-lg font-semibold text-center"
              />
              <div className="flex gap-2 mt-3 flex-wrap">
                {[500, 1000, 2000, 5000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setTopupAmount(String(v))}
                    className={`flex-1 min-w-[70px] px-3 py-2 rounded-lg text-sm font-medium ${
                      Number(topupAmount) === v
                        ? 'bg-[#f77430] text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {v} ₽
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setTopupOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium"
                >
                  Отмена
                </button>
                <button
                  onClick={handleTopupSubmit}
                  disabled={topupSubmitting}
                  className="flex-1 px-4 py-3 rounded-xl bg-[#f77430] hover:bg-[#f2622a] text-white font-semibold disabled:opacity-50"
                >
                  {topupSubmitting ? 'Создаём...' : 'Оплатить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 mb-6">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            💡 Бонусами можно оплатить до 50% стоимости заказа. 1 бонус = 1 рубль.
          </p>
        </div>

        {/* Transaction History */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            История операций
          </h2>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <div className="skeleton h-4 w-32 mb-2" />
                      <div className="skeleton h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <span className="block text-5xl text-gray-300 dark:text-gray-600 mb-4">📋</span>
              <p className="text-gray-500 dark:text-gray-400">
                Пока нет операций
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div 
                  key={tx.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {tx.description}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {tx.date}
                    </p>
                  </div>
                  <p className={`font-semibold ${
                    tx.amount > 0 ? 'text-green-500' : 'text-gray-900 dark:text-white'
                  }`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} ₽
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      <BottomNav />
    </div>
  )
}
