'use client'

import { useState, useEffect } from 'react'
import { User, Award, TrendingUp, Gift, ChevronRight, LogOut } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

interface UserProfile {
  id: string
  firstName: string
  lastName?: string
  username?: string
  balance: number
  bonusBalance: number
  totalSpent: number
  ordersCount: number
  loyaltyLevel: {
    name: string
    cashbackPercent: number
    discount: number
  }
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Загрузка данных из Telegram WebApp
    loadUserData()
  }, [])

  const loadUserData = async () => {
    // Получаем данные из Telegram
    const tg = (window as any).Telegram?.WebApp
    
    if (tg?.initDataUnsafe?.user) {
      const tgUser = tg.initDataUnsafe.user
      
      // Демо-данные для профиля
      setUser({
        id: String(tgUser.id),
        firstName: tgUser.first_name || 'Пользователь',
        lastName: tgUser.last_name,
        username: tgUser.username,
        balance: 0,
        bonusBalance: 150,
        totalSpent: 2500,
        ordersCount: 3,
        loyaltyLevel: {
          name: 'Стартовый',
          cashbackPercent: 3,
          discount: 0,
        },
      })
    } else {
      // Демо-профиль для тестирования
      setUser({
        id: '123456',
        firstName: 'Гость',
        balance: 0,
        bonusBalance: 0,
        totalSpent: 0,
        ordersCount: 0,
        loyaltyLevel: {
          name: 'Новичок',
          cashbackPercent: 0,
          discount: 0,
        },
      })
    }
    
    setLoading(false)
  }

  const menuItems = [
    { icon: Gift, label: 'Мои бонусы', value: `₽${user?.bonusBalance || 0}`, href: '#' },
    { icon: TrendingUp, label: 'Уровень лояльности', value: user?.loyaltyLevel.name || '', href: '#' },
    { icon: Award, label: 'Кэшбэк', value: `${user?.loyaltyLevel.cashbackPercent || 0}%`, href: '#' },
  ]

  if (loading) {
    return (
      <div className="container">
        <div className="glass-card text-center mb-6">
          <div className="skeleton w-24 h-24 rounded-full mx-auto mb-4" />
          <div className="skeleton h-6 w-32 mx-auto mb-2" />
          <div className="skeleton h-4 w-24 mx-auto" />
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-primary">Профиль</h1>
      </header>

      {/* User Card */}
      <div className="glass-card text-center mb-6 animate-slide-up">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <User className="text-white" size={40} />
        </div>
        <h2 className="text-xl font-bold text-primary">
          {user?.firstName} {user?.lastName}
        </h2>
        {user?.username && (
          <p className="text-secondary">@{user.username}</p>
        )}
        
        {/* Stats */}
        <div className="flex justify-around mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-xl font-bold text-primary">{user?.ordersCount}</p>
            <p className="text-xs text-muted">Заказов</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div>
            <p className="text-xl font-bold text-accent">₽{user?.bonusBalance}</p>
            <p className="text-xs text-muted">Бонусов</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div>
            <p className="text-xl font-bold text-primary">₽{user?.totalSpent}</p>
            <p className="text-xs text-muted">Потрачено</p>
          </div>
        </div>
      </div>

      {/* Loyalty Level Card */}
      <div className="glass-card mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Award className="text-white" size={28} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted">Ваш уровень</p>
            <p className="text-lg font-bold text-primary">{user?.loyaltyLevel.name}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-accent">{user?.loyaltyLevel.cashbackPercent}%</p>
            <p className="text-xs text-muted">кэшбэк</p>
          </div>
        </div>
        
        {/* Progress to next level */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted mb-2">
            <span>До следующего уровня</span>
            <span>₽{5000 - (user?.totalSpent || 0)}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all"
              style={{ width: `${Math.min(((user?.totalSpent || 0) / 5000) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="glass-card mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        {menuItems.map((item, index) => {
          const Icon = item.icon
          return (
            <div key={index}>
              <div className="flex items-center gap-4 py-3 cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Icon className="text-accent" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-primary">{item.label}</p>
                </div>
                <p className="font-semibold text-accent">{item.value}</p>
                <ChevronRight className="text-muted" size={18} />
              </div>
              {index < menuItems.length - 1 && <div className="h-px bg-gray-100" />}
            </div>
          )
        })}
      </div>

      {/* Support */}
      <div className="text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <p className="text-muted text-sm">Нужна помощь?</p>
        <a href="https://t.me/support" className="text-accent font-medium">
          Написать в поддержку
        </a>
      </div>

      <BottomNav />
    </div>
  )
}
