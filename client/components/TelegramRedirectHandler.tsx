'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TelegramRedirectHandler() {
  const router = useRouter()

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (!tg) return

    // Expand app
    tg.expand()

    const startParam = tg.initDataUnsafe?.start_param
    if (startParam) {
      console.log('🔗 Start param detected:', startParam)
      
      if (startParam === 'my_esim') {
        // Redirect to My eSIM page
        tg.showPopup({
          title: '✅ Оплата успешна!',
          message: 'Ваш eSIM готов к использованию',
          buttons: [{ type: 'ok' }]
        })
        setTimeout(() => {
          router.push('/my-esim')
        }, 500)
      } else if (startParam.startsWith('order_')) {
        // Redirect to specific order or My eSIM
        tg.showPopup({
          title: '✅ Заказ оплачен!',
          message: 'Ваш eSIM появился в разделе "Мои eSIM"',
          buttons: [{ type: 'ok' }]
        })
        setTimeout(() => {
          router.push('/my-esim')
        }, 500)
      } else if (startParam === 'payment_failed') {
        // Show error notification
        tg.showAlert('❌ Оплата не прошла. Попробуйте снова.')
      }
    }
  }, [router])

  return null
}
