'use client'

import type { ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'
import { cn } from '@/lib/utils'
import Button from './Button'

interface ModalProps {
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  className?: string
  contentClassName?: string
  closeLabel?: string
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
const INITIAL_FOCUS_SELECTOR =
  '[data-autofocus], input, select, textarea, button:not([data-modal-close]), [href], [tabindex]:not([tabindex="-1"])'

export default function Modal({
  title,
  description,
  children,
  footer,
  onClose,
  className,
  contentClassName,
  closeLabel = 'Закрыть диалог',
}: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null
    const initialFocusable = containerRef.current?.querySelector<HTMLElement>(INITIAL_FOCUS_SELECTOR)
    initialFocusable?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab' || !containerRef.current) return

      const nodes = Array.from(containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (nodes.length === 0) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus.current?.focus()
    }
  }, [])

  return (
    <div
      className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4', className)}
      onMouseDown={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        onMouseDown={(event) => event.stopPropagation()}
        className={cn(
          'glass-card glass-card--static w-full max-h-[90vh] overflow-y-auto rounded-2xl p-8 shadow-2xl',
          contentClassName,
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {title ? <h3 id={titleId} className="text-2xl font-bold text-slate-900">{title}</h3> : null}
            {description ? <p id={descriptionId} className="mt-2 text-sm text-slate-500">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" iconOnly aria-label={closeLabel} onClick={onClose} data-modal-close>
            ×
          </Button>
        </div>

        <div>{children}</div>

        {footer ? <div className="mt-6 flex flex-wrap gap-3">{footer}</div> : null}
      </div>
    </div>
  )
}
