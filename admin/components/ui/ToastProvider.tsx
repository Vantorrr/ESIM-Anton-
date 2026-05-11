'use client'

import type { ReactNode } from 'react'
import { createContext, useContext, useMemo, useState } from 'react'
import Toast, { type ToastItem } from './Toast'

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  const push = (type: ToastItem['type'], message: string) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((current) => [...current, { id, type, message }])
  }

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col gap-3">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
