'use client'

import { useEffect } from 'react'
import Button from '@/components/ui/Button'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen p-6">
      <div className="glass-card glass-card--static mx-auto max-w-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Ошибка загрузки раздела</h2>
        <p className="mt-3 text-slate-600">
          Произошла render-time ошибка. Попробуйте повторить загрузку маршрута.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={reset}>Повторить</Button>
        </div>
      </div>
    </div>
  )
}
