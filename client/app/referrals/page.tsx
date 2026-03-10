'use client'

import { useState, useEffect } from 'react'
import { Users, Copy, Share2, Gift, TrendingUp, CheckCircle } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

interface ReferralStats {
  referralCode: string
  referralLink: string
  referralsCount: number
  totalEarned: number
  pendingEarnings: number
  referralPercent: number
}

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const { isTelegramWebApp, getTelegramUserId, getToken } = await import('@/lib/auth')
      const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'mojo_mobile_bot'
      let referralCode = 'REF000000'

      if (isTelegramWebApp()) {
        const telegramId = getTelegramUserId()
        if (telegramId) {
          const { userApi } = await import('@/lib/api')
          const user = await userApi.getMe(telegramId)
          referralCode = user.referralCode
        }
      } else {
        const token = getToken()
        if (token) {
          const { api } = await import('@/lib/api')
          const { data } = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
          referralCode = data.referralCode
        }
      }
      
      setStats({
        referralCode,
        referralLink: `https://t.me/${botUsername}?start=ref_${referralCode}`,
        referralsCount: 0,
        totalEarned: 0,
        pendingEarnings: 0,
        referralPercent: 5,
      })
    } catch (e) {
      console.error('Referrals load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    if (!stats) return
    
    try {
      await navigator.clipboard.writeText(stats.referralLink)
      setCopied(true)
      
      // Haptic feedback
      const tg = (window as any).Telegram?.WebApp
      tg?.HapticFeedback?.notificationOccurred('success')
      
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Ошибка копирования:', error)
    }
  }

  const shareLink = () => {
    if (!stats) return
    
    const tg = (window as any).Telegram?.WebApp
    
    if (tg?.openTelegramLink) {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(stats.referralLink)}&text=${encodeURIComponent('Покупай eSIM со скидкой! 🌍')}`
      tg.openTelegramLink(shareUrl)
    } else {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(stats.referralLink)}`, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="container">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-primary">Реферальная программа</h1>
        </header>
        <div className="glass-card">
          <div className="skeleton h-20 w-full mb-4" />
          <div className="skeleton h-12 w-full" />
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="container bg-[#f4f5f7]">
      {/* Header */}
      <header className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-primary">Пригласи друзей</h1>
        <p className="text-secondary text-sm mt-1">Получай бонусы за каждого друга</p>
      </header>

      {/* Hero Card */}
      <div className="card-accent p-5 mb-6 animate-slide-up overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#f77430]/25 to-[#f9d17f]/25 rounded-full blur-2xl" />
        
        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f77430] to-[#f29b41] flex items-center justify-center shadow-lg">
              <Gift className="text-white" size={32} />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{stats?.referralPercent}%</p>
              <p className="text-sm text-white/85">с каждой покупки друга</p>
            </div>
          </div>
          
          <p className="text-white/90 mb-4">
            Приглашай друзей и получай <span className="font-semibold text-white">{stats?.referralPercent}%</span> от суммы их покупок на свой бонусный счёт!
          </p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="card-neutral p-5 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <p className="text-sm text-muted mb-3">Ваша реферальная ссылка</p>
        
        <div className="soft-input flex items-center gap-3 mb-4 px-4 py-3">
          <p className="flex-1 text-sm text-primary truncate font-mono">
            {stats?.referralLink}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={copyLink}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 bg-white text-[#f77430] ${copied ? 'bg-green-50 text-green-600 border-green-200' : ''}`}
            style={{ background: copied ? 'rgba(34, 197, 94, 0.1)' : undefined }}
          >
            {copied ? (
              <>
                <CheckCircle size={18} />
                <span>Скопировано</span>
              </>
            ) : (
              <>
                <Copy size={18} />
                <span>Копировать</span>
              </>
            )}
          </button>
          
          <button 
            onClick={shareLink}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#f77430] text-white font-medium shadow-md shadow-orange-200"
          >
            <Share2 size={18} />
            <span>Поделиться</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <div className="card-neutral p-4 text-center">
          <Users className="mx-auto mb-2 text-accent" size={28} />
          <p className="text-2xl font-bold text-primary">{stats?.referralsCount}</p>
          <p className="text-xs text-muted">Приглашено</p>
        </div>
        <div className="card-neutral p-4 text-center">
          <TrendingUp className="mx-auto mb-2 text-accent" size={28} />
          <p className="text-2xl font-bold text-primary">₽{stats?.totalEarned}</p>
          <p className="text-xs text-muted">Заработано</p>
        </div>
      </div>

      {/* How it works */}
      <div className="card-neutral p-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h3 className="font-semibold text-primary mb-4">Как это работает</h3>
        <div className="space-y-4">
          {[
            { step: 1, title: 'Поделитесь ссылкой', desc: 'Отправьте ссылку друзьям' },
            { step: 2, title: 'Друг регистрируется', desc: 'И совершает покупку' },
            { step: 3, title: 'Получите бонус', desc: `${stats?.referralPercent}% на ваш счёт` },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold shrink-0">
                {item.step}
              </div>
              <div>
                <p className="font-medium text-primary">{item.title}</p>
                <p className="text-sm text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
