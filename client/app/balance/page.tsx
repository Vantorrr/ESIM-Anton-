'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
// Lucide icons removed due to type issues - using emoji instead
import BottomNav from '@/components/BottomNav'

interface Transaction {
  id: string
  type: 'deposit' | 'purchase' | 'refund' | 'bonus'
  amount: number
  description: string
  date: string
}

export default function BalancePage() {
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [bonusBalance, setBonusBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    // TODO: Загрузка из API
    setBalance(0)
    setBonusBalance(150)
    setTransactions([])
    setLoading(false)
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
            onClick={() => router.back()}
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
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 text-white">
            <p className="text-sm opacity-80 mb-1">Бонусы</p>
            <p className="text-3xl font-bold">₽ {bonusBalance}</p>
          </div>
        </div>

        {/* Top Up Button */}
        <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-2xl transition-colors mb-8 shadow-lg shadow-blue-500/30">
          <span className="text-xl">➕</span>
          Пополнить баланс
        </button>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
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
