'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const NOTIFICATION_KEY = 'payment_notification'

export default function TelegramRedirectHandler() {
  const router = useRouter()
  const [processed, setProcessed] = useState(false)

  useEffect(() => {
    if (processed) return

    const tg = (window as any).Telegram?.WebApp
    if (!tg) {
      console.log('❌ Telegram WebApp not found')
      return
    }

    // Expand app
    tg.expand()

    // Получаем start_param из разных источников
    const urlParams = new URLSearchParams(window.location.search)
    const urlStartParam = urlParams.get('tgWebAppStartParam')
    const initStartParam = tg.initDataUnsafe?.start_param
    
    // Также проверяем hash параметры (на случай если Telegram передает так)
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const hashStartParam = hashParams.get('tgWebAppStartParam')
    
    const startParam = urlStartParam || hashStartParam || initStartParam
    
    console.log('🔗 TelegramRedirectHandler:', {
      url: window.location.href,
      urlStartParam,
      hashStartParam,
      initStartParam,
      final: startParam,
      initDataUnsafe: tg.initDataUnsafe
    })

    // Проверяем localStorage для отложенных уведомлений
    const savedNotification = localStorage.getItem(NOTIFICATION_KEY)
    if (savedNotification && !processed) {
      console.log('📬 Found saved notification:', savedNotification)
      localStorage.removeItem(NOTIFICATION_KEY)
      setProcessed(true)
      
      const data = JSON.parse(savedNotification)
      if (tg.showAlert) {
        tg.showAlert(data.message, () => {
          if (data.redirect) {
            router.push(data.redirect)
          }
        })
      } else {
        alert(data.message)
        if (data.redirect) {
          router.push(data.redirect)
        }
      }
      return
    }

    if (startParam && !processed) {
      console.log('✅ Start param detected:', startParam)
      setProcessed(true)
      
      if (startParam === 'my_esim' || startParam.startsWith('order_')) {
        const message = startParam.startsWith('order_') 
          ? '✅ Заказ оплачен! Ваш eSIM готов'
          : '✅ Оплата успешна!'
        
        // Сохраняем в localStorage на случай если уведомление не покажется сразу
        localStorage.setItem(NOTIFICATION_KEY, JSON.stringify({
          message,
          redirect: '/my-esim',
          timestamp: Date.now()
        }))
        
        // Показываем уведомление
        if (tg.showAlert) {
          tg.showAlert(message, () => {
            localStorage.removeItem(NOTIFICATION_KEY)
            router.push('/my-esim')
          })
        } else {
          alert(message)
          localStorage.removeItem(NOTIFICATION_KEY)
          router.push('/my-esim')
        }
      } else if (startParam === 'payment_failed') {
        const message = '❌ Оплата не прошла. Попробуйте снова.'
        if (tg.showAlert) {
          tg.showAlert(message)
        } else {
          alert(message)
        }
      }
    }
  }, [router, processed])

  return null
}
