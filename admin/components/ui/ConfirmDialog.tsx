'use client'

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import Button from './Button'
import Modal from './Modal'

type ConfirmVariant = 'default' | 'destructive'

interface ConfirmOptions {
  title?: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
}

interface ConfirmState extends Required<ConfirmOptions> {
  resolve: (value: boolean) => void
}

type ConfirmFn = (options: string | ConfirmOptions) => Promise<boolean>

const ConfirmDialogContext = createContext<ConfirmFn | null>(null)

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)

  const close = useCallback((value: boolean) => {
    setState((current) => {
      current?.resolve(value)
      return null
    })
  }, [])

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      if (typeof options === 'string') {
        setState({
          title: 'Подтверждение',
          description: options,
          confirmLabel: 'Подтвердить',
          cancelLabel: 'Отмена',
          variant: 'default',
          resolve,
        })
        return
      }

      setState({
        title: options.title ?? 'Подтверждение',
        description: options.description,
        confirmLabel: options.confirmLabel ?? 'Подтвердить',
        cancelLabel: options.cancelLabel ?? 'Отмена',
        variant: options.variant ?? 'default',
        resolve,
      })
    })
  }, [])

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      {state ? (
        <Modal title={state.title} description={state.description} onClose={() => close(false)} contentClassName="max-w-md">
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => close(false)}>
              {state.cancelLabel}
            </Button>
            <Button
              variant={state.variant === 'destructive' ? 'destructive' : 'primary'}
              onClick={() => close(true)}
            >
              {state.confirmLabel}
            </Button>
          </div>
        </Modal>
      ) : null}
    </ConfirmDialogContext.Provider>
  )
}

export function useConfirmDialog() {
  const context = useContext(ConfirmDialogContext)
  if (!context) throw new Error('useConfirmDialog must be used within ConfirmDialogProvider')
  return context
}
