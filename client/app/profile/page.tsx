'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  DollarSign, Smartphone, ShoppingBag, Globe, Moon, Bell, Sun, Monitor,
  ChevronRight, Gift, HelpCircle, FileText, MessageCircle, X, Check
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

type Theme = 'light' | 'dark' | 'system'
type Language = 'ru' | 'en'

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [promoCode, setPromoCode] = useState('')
  const [theme, setTheme] = useState<Theme>('system')
  const [language, setLanguage] = useState<Language>('ru')
  const [notifications, setNotifications] = useState(true)
  
  // Modals
  const [showThemeModal, setShowThemeModal] = useState(false)
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [showNotificationsModal, setShowNotificationsModal] = useState(false)

  useEffect(() => {
    loadUserData()
    // Загружаем сохранённые настройки
    const savedTheme = localStorage.getItem('theme') as Theme
    const savedLang = localStorage.getItem('language') as Language
    const savedNotifications = localStorage.getItem('notifications')
    
    if (savedTheme) setTheme(savedTheme)
    if (savedLang) setLanguage(savedLang)
    if (savedNotifications !== null) setNotifications(savedNotifications === 'true')
  }, [])
  
  // Применение темы
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // system
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
    localStorage.setItem('theme', theme)
  }, [theme])
  
  const changeLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('language', lang)
    setShowLanguageModal(false)
  }
  
  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    setShowThemeModal(false)
  }
  
  const toggleNotifications = () => {
    const newValue = !notifications
    setNotifications(newValue)
    localStorage.setItem('notifications', String(newValue))
  }

  const loadUserData = async () => {
    try {
      const { isTelegramWebApp, getToken } = await import('@/lib/auth')

      if (isTelegramWebApp()) {
        const tg = (window as any).Telegram?.WebApp
        const tgUser = tg?.initDataUnsafe?.user
        if (tgUser) {
          const { userApi: profileUserApi } = await import('@/lib/api')
          const dbUser = await profileUserApi.getMe(String(tgUser.id))
          setUser({
            id: dbUser.id,
            firstName: tgUser.first_name || 'Пользователь',
            lastName: tgUser.last_name,
            username: tgUser.username,
            photoUrl: tgUser.photo_url,
            balance: Number(dbUser.balance) || 0,
            bonusBalance: Number(dbUser.bonusBalance) || 0,
            referralCode: dbUser.referralCode,
          })
        }
      } else {
        const token = getToken()
        if (token) {
          const { api } = await import('@/lib/api')
          const { data } = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
          setUser({
            id: data.id,
            firstName: data.firstName || 'Пользователь',
            lastName: data.lastName,
            username: data.username,
            balance: Number(data.balance) || 0,
            bonusBalance: Number(data.bonusBalance) || 0,
            referralCode: data.referralCode,
          })
        } else {
          window.location.href = '/login'
          return
        }
      }
    } catch (e) {
      console.error('Profile load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const applyPromoCode = () => {
    if (promoCode.trim()) {
      alert('Промокод применён!')
      setPromoCode('')
    }
  }

  const shareReferral = () => {
    const shareText = `🎁 Дарю тебе скидку 20% на первую покупку в Mojo mobile!\n\nИспользуй мой код: ${user?.referralCode}\n\nПереходи: https://t.me/mojo_mobile_bot`
    const tg = (window as any).Telegram?.WebApp
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareText)}`)
    } else if (navigator.share) {
      navigator.share({ text: shareText })
    } else {
      navigator.clipboard?.writeText(shareText)
      alert('Ссылка скопирована!')
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
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f77430]"
              />
              <button
                onClick={applyPromoCode}
                className="px-6 py-3 bg-[#f77430] hover:bg-[#f2622a] text-white font-medium rounded-xl transition-colors"
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
                className="px-5 py-2.5 bg-white text-[#f77430] font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
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
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Gift className="text-[#f77430] dark:text-[#f29b41]" size={20} />
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
            
            <button 
              onClick={() => setShowLanguageModal(true)}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Globe className="text-[#f77430] dark:text-[#f29b41]" size={20} />
              </div>
              <span className="flex-1 font-medium text-gray-900 dark:text-white text-left">Язык</span>
              <span className="text-gray-400 text-sm mr-1">
                {language === 'ru' ? 'Русский' : 'English'}
              </span>
              <ChevronRight className="text-gray-400" size={20} />
            </button>
            
            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4" />
            
            <button 
              onClick={() => setShowThemeModal(true)}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-800 dark:bg-gray-600 flex items-center justify-center">
                {theme === 'dark' ? <Moon className="text-white" size={20} /> : 
                 theme === 'light' ? <Sun className="text-white" size={20} /> :
                 <Monitor className="text-white" size={20} />}
              </div>
              <span className="flex-1 font-medium text-gray-900 dark:text-white text-left">Тема</span>
              <span className="text-gray-400 text-sm mr-1">
                {theme === 'light' ? 'Светлая' : theme === 'dark' ? 'Тёмная' : 'Авто'}
              </span>
              <ChevronRight className="text-gray-400" size={20} />
            </button>
            
            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4" />
            
            <button 
              onClick={() => setShowNotificationsModal(true)}
              className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                <Bell className="text-pink-600 dark:text-pink-400" size={20} />
              </div>
              <span className="flex-1 font-medium text-gray-900 dark:text-white text-left">Уведомления</span>
              <span className={`text-sm mr-1 ${notifications ? 'text-green-500' : 'text-gray-400'}`}>
                {notifications ? 'Вкл' : 'Выкл'}
              </span>
              <ChevronRight className="text-gray-400" size={20} />
            </button>
            
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
                <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <MessageCircle className="text-[#f77430] dark:text-[#f29b41]" size={20} />
                </div>
                <span className="flex-1 font-medium text-gray-900 dark:text-white">Поддержка</span>
                <ChevronRight className="text-gray-400" size={20} />
              </div>
            </a>
            
            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-4" />
            
            <Link href="/offer">
              <div className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <FileText className="text-gray-600 dark:text-gray-400" size={20} />
                </div>
                <span className="flex-1 font-medium text-gray-900 dark:text-white">Публичная оферта</span>
                <ChevronRight className="text-gray-400" size={20} />
              </div>
            </Link>
            
          </div>
        </section>

        {/* App Version */}
        <p className="text-center text-gray-400 text-sm">
          Версия 1.0.0
        </p>

      </div>
      
      {/* Language Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowLanguageModal(false)}>
          <div 
            className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Выбор языка</h3>
              <button onClick={() => setShowLanguageModal(false)} className="p-2">
                <X className="text-gray-400" size={24} />
              </button>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => changeLanguage('ru')}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-colors ${
                  language === 'ru' ? 'bg-orange-50 dark:bg-orange-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇷🇺</span>
                  <span className="font-medium text-gray-900 dark:text-white">Русский</span>
                </div>
                {language === 'ru' && <Check className="text-[#f77430]" size={20} />}
              </button>
              <button 
                onClick={() => changeLanguage('en')}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-colors ${
                  language === 'en' ? 'bg-orange-50 dark:bg-orange-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🇬🇧</span>
                  <span className="font-medium text-gray-900 dark:text-white">English</span>
                </div>
                {language === 'en' && <Check className="text-[#f77430]" size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Theme Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowThemeModal(false)}>
          <div 
            className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Выбор темы</h3>
              <button onClick={() => setShowThemeModal(false)} className="p-2">
                <X className="text-gray-400" size={24} />
              </button>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => changeTheme('light')}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-colors ${
                  theme === 'light' ? 'bg-orange-50 dark:bg-orange-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sun className="text-yellow-500" size={24} />
                  <span className="font-medium text-gray-900 dark:text-white">Светлая</span>
                </div>
                {theme === 'light' && <Check className="text-[#f77430]" size={20} />}
              </button>
              <button 
                onClick={() => changeTheme('dark')}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-colors ${
                  theme === 'dark' ? 'bg-orange-50 dark:bg-orange-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Moon className="text-[#f29b41]" size={24} />
                  <span className="font-medium text-gray-900 dark:text-white">Тёмная</span>
                </div>
                {theme === 'dark' && <Check className="text-[#f77430]" size={20} />}
              </button>
              <button 
                onClick={() => changeTheme('system')}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-xl transition-colors ${
                  theme === 'system' ? 'bg-orange-50 dark:bg-orange-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Monitor className="text-gray-500" size={24} />
                  <span className="font-medium text-gray-900 dark:text-white">Как в системе</span>
                </div>
                {theme === 'system' && <Check className="text-[#f77430]" size={20} />}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowNotificationsModal(false)}>
          <div 
            className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Уведомления</h3>
              <button onClick={() => setShowNotificationsModal(false)} className="p-2">
                <X className="text-gray-400" size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between px-4 py-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Push-уведомления</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Статус заказов, акции</p>
                </div>
                <button
                  onClick={toggleNotifications}
                  className={`w-14 h-8 rounded-full transition-colors relative ${
                    notifications ? 'bg-[#f77430]' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    notifications ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Мы будем отправлять только важные уведомления о ваших заказах и специальных предложениях
              </p>
            </div>
          </div>
        </div>
      )}
      
      <BottomNav />
    </div>
  )
}
