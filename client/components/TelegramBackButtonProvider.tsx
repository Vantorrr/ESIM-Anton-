'use client'

import { useTelegramBackButton } from '@/hooks/useTelegramBackButton'

/**
 * Тонкий провайдер: ничего не рендерит, только подключает хук
 * `useTelegramBackButton` к глобальному layout. Вынесен в отдельный
 * клиентский компонент, чтобы корневой `app/layout.tsx` мог оставаться
 * максимально стабильным и не превращаться в полностью клиентский.
 */
export default function TelegramBackButtonProvider() {
  useTelegramBackButton()
  return null
}
