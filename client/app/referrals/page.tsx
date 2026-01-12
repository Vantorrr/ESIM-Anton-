'use client'

import { useState, useEffect } from 'react'
import { Gift, Users, TrendingUp, Copy, CheckCircle, Share2 } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { referralsApi, userApi, ReferralStats, User } from '@/lib/api'

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

export default function ReferralsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const tgUser = useTelegramUser()

  useEffect(() => {
    if (tgUser?.id) {
      initUser()
    }
  }, [tgUser])

  const initUser = async () => {
    try {
      const userData = await userApi.getMe(tgUser.id.toString())
      setUser(userData)
      await loadStats(userData.id)
    } catch (error) {
      console.error('Ошибка инициализации:', error)
      setLoading(false)
    }
  }

  const loadStats = async (uid: string) => {
    try {
      const data = await referralsApi.getStats(uid)
      setStats(data)
      setLoading(false)
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error)
      setLoading(false)
    }
  }

  const getReferralLink = () => {
    if (!user) return ''
    // Получаем bot username из Telegram WebApp
    const botUsername = window.Telegram?.WebApp?.initDataUnsafe?.user ? 'your_bot_username' : 'your_bot_username'
    return `https://t.me/${botUsername}?start=ref_${user.referralCode}`
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getReferralLink())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Ошибка копирования:', error)
    }
  }

  const shareLink = () => {
    const link = getReferralLink()
    const text = `🎁 Получите eSIM для путешествий!\n\nИспользуйте мою реферальную ссылку и получите бонусы при первой покупке!`
    
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <h1 className="text-2xl font-bold mb-6 mt-6">Реферальная программа</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="tg-card">
              <div className="skeleton h-24" />
            </div>
          ))}
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="mb-6 mt-6 animate-fade-in">
        <h1 className="text-2xl font-bold mb-2">🎁 Реферальная программа</h1>
        <p className="tg-hint">Приглашайте друзей и зарабатывайте!</p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4 animate-slide-up">
        <div className="tg-card text-center">
          <Users className="mx-auto mb-2" size={24} style={{ color: 'var(--tg-theme-button-color)' }} />
          <p className="tg-hint text-xs mb-1">Рефералов</p>
          <p className="text-2xl font-bold">{stats?.referralCount || 0}</p>
        </div>
        <div className="tg-card text-center">
          <TrendingUp className="mx-auto mb-2" size={24} style={{ color: 'var(--tg-theme-button-color)' }} />
          <p className="tg-hint text-xs mb-1">Заработано</p>
          <p className="text-2xl font-bold">₽{Number(stats?.totalEarned || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* How it works */}
      <div className="tg-card mb-4">
        <h3 className="font-bold mb-3">Как это работает?</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>
              1
            </div>
            <div>
              <p className="font-semibold mb-1">Поделитесь ссылкой</p>
              <p className="tg-hint text-sm">Отправьте реферальную ссылку друзьям</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>
              2
            </div>
            <div>
              <p className="font-semibold mb-1">Друг регистрируется</p>
              <p className="tg-hint text-sm">Ваш друг переходит по ссылке и регистрируется</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>
              3
            </div>
            <div>
              <p className="font-semibold mb-1">Получайте бонусы</p>
              <p className="tg-hint text-sm">Вы получаете 5% с каждой покупки друга</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="tg-card mb-4">
        <h3 className="font-bold mb-3">Ваша реферальная ссылка</h3>
        <div className="p-3 rounded-lg mb-3" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
          <p className="text-sm break-all">{getReferralLink()}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={copyLink}
            className="tg-button-outline flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <CheckCircle size={16} />
                Скопировано
              </>
            ) : (
              <>
                <Copy size={16} />
                Копировать
              </>
            )}
          </button>
          <button
            onClick={shareLink}
            className="tg-button flex items-center justify-center gap-2"
          >
            <Share2 size={16} />
            Поделиться
          </button>
        </div>
      </div>

      {/* Referrals List */}
      {stats && stats.referrals.length > 0 && (
        <div className="tg-card mb-20">
          <h3 className="font-bold mb-3">Ваши рефералы</h3>
          <div className="space-y-2">
            {stats.referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex justify-between items-center p-2 rounded"
                style={{ background: 'var(--tg-theme-secondary-bg-color)' }}
              >
                <div>
                  <p className="font-semibold">{referral.firstName || 'Пользователь'}</p>
                  <p className="tg-hint text-xs">
                    {new Date(referral.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold" style={{ color: 'var(--tg-theme-button-color)' }}>
                    ₽{Number(referral.totalSpent).toFixed(2)}
                  </p>
                  <p className="tg-hint text-xs">потрачено</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats && stats.referrals.length === 0 && (
        <div className="tg-card text-center py-8 mb-20">
          <Gift className="mx-auto mb-3 tg-hint" size={48} />
          <p className="tg-hint mb-2">У вас пока нет рефералов</p>
          <p className="tg-hint text-sm">Поделитесь ссылкой с друзьями!</p>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
