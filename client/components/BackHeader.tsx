'use client'

import { ArrowLeft } from '@/components/icons'
import { useSmartBack } from '@/lib/useSmartBack'

interface BackHeaderProps {
  /** Заголовок страницы (по центру) */
  title: string
  /** Fallback-роут для useSmartBack (если не передан onBack) */
  fallbackRoute?: string
  /** Кастомный обработчик назад (перекрывает useSmartBack) */
  onBack?: () => void
  /** Дополнительные CSS-классы (по умолчанию mb-4) */
  className?: string
}

export default function BackHeader({ title, fallbackRoute = '/', onBack, className = 'mb-4' }: BackHeaderProps) {
  const smartBack = useSmartBack(fallbackRoute)
  const handleBack = onBack ?? smartBack

  return (
    <div className={`header-back sticky top-0 z-40 bg-[#f4f5f7]/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200/70 dark:border-gray-800 -mx-5 px-5 pt-3 pb-3 ${className}`}>
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-semibold text-lg text-gray-900 dark:text-white">{title}</h1>
        <div className="w-10" />
      </div>
    </div>
  )
}
