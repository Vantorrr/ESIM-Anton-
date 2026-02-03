'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ordersApi, userApi } from '@/lib/api'

const LAST_NOTIFIED_ORDER_KEY = 'last_notified_order_id'

export default function TelegramRedirectHandler() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (checked) return

    const checkForNewOrders = async () => {
      const tg = (window as any).Telegram?.WebApp
      if (!tg) {
        console.log('❌ Telegram WebApp not found')
        return
      }

      // Expand app
      tg.expand()

      // Проверяем параметр startapp для редиректа
      const startParam = tg.initDataUnsafe?.start_param
      console.log('🔗 start_param:', startParam)
      
      if (startParam === 'my-esim') {
        console.log('✅ Redirecting to /my-esim from startapp parameter')
        router.push('/my-esim')
        setChecked(true)
        return
      }

      try {
        // Получаем telegramId
        const telegramId = tg.initDataUnsafe?.user?.id || 316662303 // fallback
        console.log('🔍 Checking for new orders, telegramId:', telegramId)

        // Получаем пользователя
        const user = await userApi.getMe(String(telegramId))
        
        // Проверяем новые заказы
        const { hasNewOrders, latestOrder } = await ordersApi.checkNew(user.id)
        
        console.log('📦 Check result:', { hasNewOrders, latestOrder })
        
        if (hasNewOrders && latestOrder) {
          // Проверяем, показывали ли мы уже уведомление для этого заказа
          const lastNotifiedOrderId = localStorage.getItem(LAST_NOTIFIED_ORDER_KEY)
          
          if (lastNotifiedOrderId !== latestOrder.id) {
            console.log('✅ New order detected! Showing notification:', latestOrder.id)
            
            // Сохраняем ID заказа, чтобы не показывать уведомление повторно
            localStorage.setItem(LAST_NOTIFIED_ORDER_KEY, latestOrder.id)
            
            // Показываем уведомление
            const message = `✅ Заказ оплачен!\n\neSIM для ${latestOrder.product.country}\n${latestOrder.product.dataAmount} готов к использованию`
            
            if (tg.showAlert) {
              tg.showAlert(message, () => {
                router.push('/my-esim')
              })
            } else {
              alert(message)
              router.push('/my-esim')
            }
          } else {
            console.log('ℹ️ Order already notified:', latestOrder.id)
          }
        } else {
          console.log('ℹ️ No new orders')
        }
      } catch (error) {
        console.error('❌ Error checking new orders:', error)
      } finally {
        setChecked(true)
      }
    }

    // Небольшая задержка чтобы дать приложению загрузиться
    const timer = setTimeout(() => {
      checkForNewOrders()
    }, 1000)

    return () => clearTimeout(timer)
  }, [router, checked])

  return null
}
