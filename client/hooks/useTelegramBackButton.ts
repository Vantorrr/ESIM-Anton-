'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Подключает системную кнопку «Назад» в Telegram WebApp.
 *
 * Поведение:
 *  - На главной (`/`) кнопка скрыта — системный back/swipe закрывает мини-приложение
 *    (как и хотят клиенты — стандартное Telegram-поведение).
 *  - На любых других экранах кнопка показана. Её клик и системный жест «Назад»
 *    оба триггерят зарегистрированный onClick — мы вызываем `router.back()`,
 *    а если истории нет (зашли по deep-link) — пушим на `/`.
 *  - В non-Telegram среде (обычный браузер, Next dev) хук — no-op.
 *
 * Важно:
 *  - На каждом изменении `pathname` мы пересоздаём callback, чтобы он замыкался
 *    на актуальный router. Старый callback обязательно `offClick`-аем, иначе
 *    Telegram держит несколько подписчиков и навигация ломается.
 *  - При unmount кнопку прячем — иначе при возврате на `/` она остаётся
 *    в DOM-Telegram'е.
 */
export function useTelegramBackButton(): void {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
    if (!tg?.BackButton) return

    const isHome = pathname === '/' || pathname === ''

    if (isHome) {
      tg.BackButton.hide()
      return
    }

    const handler = () => {
      try {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back()
        } else {
          router.push('/')
        }
      } catch {
        router.push('/')
      }
    }

    tg.BackButton.onClick(handler)
    tg.BackButton.show()

    return () => {
      try {
        tg.BackButton.offClick(handler)
      } catch {
        // Telegram <6.1 может не поддерживать offClick — игнорируем
      }
      tg.BackButton.hide()
    }
  }, [pathname, router])
}
