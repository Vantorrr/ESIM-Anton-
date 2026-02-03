'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Smartphone, Plus, Wifi, WifiOff, RefreshCw, QrCode } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { getCountryEmoji, formatDataAmount } from '@/lib/utils'
import { userApi, ordersApi } from '@/lib/api'

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
}

export default function MyEsimPage() {
  const router = useRouter()
  const [esims, setEsims] = useState<MyEsim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEsims()
  }, [])

  const loadEsims = async () => {
    try {
      // Получаем Telegram user ID
      const tg = (window as any).Telegram?.WebApp;
      const telegramId = tg?.initDataUnsafe?.user?.id || 316662303; // fallback
      
      const user = await userApi.getMe(String(telegramId));
      const orders = await ordersApi.getMy(user.id);
      
      // Фильтруем только оплаченные и завершенные заказы
      const activeOrders = orders.filter(o => 
        o.status === 'PAID' || o.status === 'COMPLETED'
      );

      const mappedEsims: MyEsim[] = activeOrders.map(order => ({
        id: order.id,
        iccid: order.iccid || 'Ожидает генерации...',
        country: order.product.country,
        dataAmount: formatDataAmount(order.product.dataAmount),
        usedData: '0 MB', // TODO: Получать реальное использование
        validUntil: new Date(new Date(order.createdAt).getTime() + order.product.validityDays * 24 * 60 * 60 * 1000).toLocaleDateString(),
        status: 'active', // TODO: Реальный статус от провайдера
        qrCode: order.qrCode,
        activationCode: order.activationCode,
        canTopup: true
      }));

      setEsims(mappedEsims);
    } catch (error) {
      console.error('Ошибка загрузки eSIM:', error);
    } finally {
      setLoading(false);
    }
  }

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
            onClick={() => router.back()}
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
              <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors">
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
                  
                  {/* Data Usage */}
                  {esim.status === 'active' && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500 dark:text-gray-400">Использовано</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {esim.usedData} / {esim.dataAmount}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: '30%' }}
                        />
                      </div>
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
                      <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium text-sm transition-colors">
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
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer">
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
