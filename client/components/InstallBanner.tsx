'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function InstallBanner() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Don't show in Telegram WebApp
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) return

    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Don't show if dismissed
    if (localStorage.getItem('pwa-banner-dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari detection
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone
    if (isIOS && !isInStandaloneMode && !localStorage.getItem('pwa-banner-dismissed')) {
      setShow(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setShow(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem('pwa-banner-dismissed', '1')
  }

  if (!show) return null

  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="glass-card flex items-center gap-3 shadow-2xl border border-white/20">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f2622a] to-[#f9d17f] flex items-center justify-center shrink-0 p-1.5">
          <img src="/logo-mark.png" alt="Mojo mobile" className="w-full h-full object-contain rounded-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-primary text-sm">Установить Mojo mobile</p>
          {isIOS ? (
            <p className="text-xs text-secondary">Нажмите <span className="font-medium">Поделиться</span> → <span className="font-medium">На экран «Домой»</span></p>
          ) : (
            <p className="text-xs text-secondary">Добавьте на главный экран для быстрого доступа</p>
          )}
        </div>
        {!isIOS && (
          <button onClick={handleInstall} className="shrink-0 px-3 py-1.5 bg-accent text-white rounded-xl text-xs font-semibold">
            Установить
          </button>
        )}
        <button onClick={handleDismiss} className="shrink-0 text-muted hover:text-primary">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
