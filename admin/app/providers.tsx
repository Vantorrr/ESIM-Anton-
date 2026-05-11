'use client'

import type { ReactNode } from 'react'
import AuthProvider from '@/components/AuthProvider'
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog'
import { ToastProvider } from '@/components/ui/ToastProvider'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
