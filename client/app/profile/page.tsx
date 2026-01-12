'use client'

import { useState, useEffect } from 'react'
import { User as UserIcon, Wallet, Award, TrendingUp, LogOut } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { userApi, User } from '@/lib/api'

// Хук для получения Telegram данных
function useTelegramUser() {
  const [tgUser, setTgUser] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const user = window.Telegram.WebApp.initDataUnsafe?.user
      setTgUser(user)
    }
  }, [])

  return tgUser
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const tgUser = useTelegramUser()

  useEffect(() => {
    if (tgUser?.id) {
      loadUser()
    }
  }, [tgUser])

  const loadUser = async () => {
    try {
      const data = await userApi.getMe(tgUser.id.toString())
      setUser(data)
      setLoading(false)
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="space-y-4 mt-6">
          <div className="tg-card">
            <div className="skeleton h-20 w-20 rounded-full mb-4" />
            <div className="skeleton h-6 w-48 mb-2" />
            <div className="skeleton h-4 w-32" />
          </div>
          <div className="tg-card">
            <div className="skeleton h-24" />
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container">
        <div className="tg-card text-center py-12 mt-6">
          <UserIcon className="mx-auto mb-4 tg-hint" size={48} />
          <p className="tg-hint">Не удалось загрузить профиль</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="mb-6 mt-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Профиль</h1>
      </header>

      {/* User Info */}
      <div className="tg-card mb-4 animate-slide-up text-center">
        <div
          className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold"
          style={{ background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
        >
          {user.firstName?.[0] || user.username?.[0] || '?'}
        </div>
        <h2 className="text-xl font-bold mb-1">
          {user.firstName} {user.lastName}
        </h2>
        {user.username && (
          <p className="tg-hint">@{user.username}</p>
        )}
        
        {user.loyaltyLevel && (
          <div className="mt-4 inline-block">
            <div className="badge badge-info flex items-center gap-1">
              <Award size={14} />
              {user.loyaltyLevel.name}
            </div>
          </div>
        )}
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="tg-card text-center">
          <Wallet className="mx-auto mb-2" size={24} style={{ color: 'var(--tg-theme-button-color)' }} />
          <p className="tg-hint text-xs mb-1">Баланс</p>
          <p className="text-xl font-bold">₽{Number(user.balance).toFixed(2)}</p>
        </div>
        <div className="tg-card text-center">
          <Award className="mx-auto mb-2" size={24} style={{ color: 'var(--tg-theme-button-color)' }} />
          <p className="tg-hint text-xs mb-1">Бонусы</p>
          <p className="text-xl font-bold">₽{Number(user.bonusBalance).toFixed(2)}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="tg-card mb-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <TrendingUp size={20} />
          Статистика
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="tg-hint">Всего потрачено</span>
            <span className="font-semibold">₽{Number(user.totalSpent).toFixed(2)}</span>
          </div>
          {user.loyaltyLevel && (
            <>
              <div className="flex justify-between">
                <span className="tg-hint">Кэшбэк</span>
                <span className="font-semibold">{Number(user.loyaltyLevel.cashbackPercent)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="tg-hint">Скидка</span>
                <span className="font-semibold">{Number(user.loyaltyLevel.discount)}%</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loyalty Progress */}
      {user.loyaltyLevel && (
        <div className="tg-card mb-4">
          <h3 className="font-bold mb-3">Уровень лояльности</h3>
          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span>{user.loyaltyLevel.name}</span>
              <span className="tg-hint">₽{Number(user.totalSpent).toFixed(0)} / ₽{Number(user.loyaltyLevel.minSpent).toFixed(0)}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (Number(user.totalSpent) / Number(user.loyaltyLevel.minSpent)) * 100)}%`,
                  background: 'var(--tg-theme-button-color)',
                }}
              />
            </div>
          </div>
          <p className="text-xs tg-hint mt-2">
            Продолжайте покупать, чтобы повысить уровень и получить больше преимуществ!
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 mb-20">
        <button className="tg-button flex items-center justify-center gap-2">
          <UserIcon size={20} />
          Редактировать профиль
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
