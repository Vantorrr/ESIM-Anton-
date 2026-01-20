'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  DollarSign, Smartphone, ShoppingBag, Globe, Moon, Bell, 
  ChevronRight, Gift, HelpCircle, FileText, MessageCircle
} from 'lucide-react'
import BottomNav from '@/components/BottomNav'

interface UserProfile {
  id: string
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  balance: number
  bonusBalance: number
  referralCode: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [promoCode, setPromoCode] = useState('')
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    const tg = (window as any).Telegram?.WebApp
    
    if (tg?.initDataUnsafe?.user) {
      const tgUser = tg.initDataUnsafe.user
      setUser({
        id: String(tgUser.id),
        firstName: tgUser.first_name || 'Пользователь',
        lastName: tgUser.last_name,
        username: tgUser.username,
        photoUrl: tgUser.photo_url,
        balance: 0,
        bonusBalance: 150,
        referralCode: 'ESIM' + String(tgUser.id).slice(-6),
      })
    } else {
      setUser({
        id: '123456',
        firstName: 'Гость',
        balance: 0,
        bonusBalance: 0,
        referralCode: 'ESIM123456',
      })
    }
    
    setLoading(false)
  }

  const applyPromoCode = () => {
    if (promoCode.trim()) {
      alert('Промокод применён!')
      setPromoCode('')
    }
  }

  const shareReferral = () => {
    const tg = (window as any).Telegram?.WebApp
    const shareText = `🎁 Дарю тебе скидку 20% на первую покупку eSIM!\n\nИспользуй мой код: ${user?.referralCode}\n\nПереходи: https://t.me/your_bot`
    
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareText)}`)
    } else {
      navigator.share?.({ text: shareText })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="px-4 py-6">
          <div className="skeleton h-8 w-32 mb-6" />
          <div className="skeleton h-20 w-full rounded-2xl mb-4" />
          <div className="skeleton h-14 w-full rounded-2xl mb-4" />
          <div className="skeleton h-32 w-full rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="px-4 py-6 max-w-lg mx-auto">
        
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Аккаунт
        </h1>

        {/* Deposit / Balance */}
        <section className="mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 px-1">Депозит</p>
          <Link href="/balance">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <DollarSign className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Баланс:</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    ₽ {user?.balance || 0}
                  </p>
                </div>
              </div>
              <ChevronRight className="text-gray-400" size={20} />
            </div>
          </Link>
        </section>

        {/* Promo Code */}
        <section className="mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Промокод"
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={applyPromoCode}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
              >
                Ok
              </button>
            </div>
          </div>
        </section>

        {/* Referral Banner */}
        <section className="mb-6">
          <div 
            className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
            }}
          >
            <div className="relative z-10">
              <p className="text-white font-semibold text-lg mb-3">
                Получи бонус ₽300, и дай другу скидку 20%!
              </p>
              <button
                onClick={shareReferral}
                className="px-5 py-2.5 bg-white text-purple-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                Пригласить друга
              </button>
            </div>
            {/* Decorative gift */}
            <div className="absolute right-4 bottom-2 opacity-90">
              <Gift size={80} className="text-white/30" />
            </div>
          </div>
        </section>

        {/* Profile Section */}
        <section className="mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 px-1">Профиль</p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            
            <Link href="/my-esim">
              <div className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Smartphone className="text-green-600 dark:text-green-400" size={20} />
                </div>
                <span className="flex-1 font-medium text-gray-900 dark:text-white">Мои eSIM</span>
                <ChevronRight className="text-gray-400" size={20} />
              </div>
            </Link>
            
            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4" />
            
            <Link href="/orders">
              <div className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <ShoppingBag className="text-orange-600 dark:text-orange-400" size={20} />
                </div>
                <span className="flex-1 font-medium text-gray-900 dark:text-white">Заказы</span>
                <ChevronRight className="text-gray-400" size={20} />
              </div>
            </Link>

            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4" />
            
            <Link href="/referrals">
              <div className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Gift className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <span className="flex-1 font-medium text-gray-900 dark:text-white">Реферальная программа</span>
                <ChevronRight className="text-gray-400" size={20} />
              </div>
            </Link>
            
          </div>
        </section>

        {/* Settings Section */}
        <section className="mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 px-1">Настройки</p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            
            <div className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Globe className="text-blue-600 dark:text-blue-400" size={20} />
              </div>
              <span className="flex-1 font-medium text-gray-900 dark:text-white">Язык</span>
              <span className="text-gray-400 text-sm mr-1">Русский</span>
              <ChevronRight className="text-gray-400" size={20} />
            </div>
            
            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4" />
            
            <div className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gray-800 dark:bg-gray-600 flex items-center justify-center">
                <Moon className="text-white" size={20} />
              </div>
              <span className="flex-1 font-medium text-gray-900 dark:text-white">Тема</span>
              <span className="text-gray-400 text-sm mr-1">Авто</span>
              <ChevronRight className="text-gray-400" size={20} />
            </div>
            
            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4" />
            
            <div className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <Bell className="text-pink-600 dark:text-pink-400" size={20} />
              </div>
              <span className="flex-1 font-medium text-gray-900 dark:text-white">Уведомления</span>
              <ChevronRight className="text-gray-400" size={20} />
            </div>
            
          </div>
        </section>

        {/* Other Section */}
        <section className="mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 px-1">Другое</p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            
            <Link href="/help">
              <div className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                  <HelpCircle className="text-cyan-600 dark:text-cyan-400" size={20} />
                </div>
                <span className="flex-1 font-medium text-gray-900 dark:text-white">Помощь</span>
                <ChevronRight className="text-gray-400" size={20} />
              </div>
            </Link>
            
            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4" />
            
            <a href="https://t.me/support" target="_blank" rel="noopener noreferrer">
              <div className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <MessageCircle className="text-indigo-600 dark:text-indigo-400" size={20} />
                </div>
                <span className="flex-1 font-medium text-gray-900 dark:text-white">Поддержка</span>
                <ChevronRight className="text-gray-400" size={20} />
              </div>
            </a>
            
            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4" />
            
            <div className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <FileText className="text-gray-600 dark:text-gray-400" size={20} />
              </div>
              <span className="flex-1 font-medium text-gray-900 dark:text-white">Условия использования</span>
              <ChevronRight className="text-gray-400" size={20} />
            </div>
            
          </div>
        </section>

        {/* App Version */}
        <p className="text-center text-gray-400 text-sm">
          Версия 1.0.0
        </p>

      </div>
      
      <BottomNav />
    </div>
  )
}
