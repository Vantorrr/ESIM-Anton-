'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

interface ToastProps {
  toast: ToastItem
  onDismiss: (id: string) => void
}

const toneClasses: Record<ToastItem['type'], string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timeout = window.setTimeout(() => onDismiss(toast.id), 5000)
    return () => window.clearTimeout(timeout)
  }, [onDismiss, toast.id])

  return (
    <div
      className={cn(
        'pointer-events-auto min-w-[260px] max-w-sm rounded-xl border px-4 py-3 shadow-lg',
        toneClasses[toast.type],
      )}
      aria-live="polite"
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{toast.message}</p>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-current/70 hover:text-current"
          aria-label="Закрыть уведомление"
        >
          ×
        </button>
      </div>
    </div>
  )
}
