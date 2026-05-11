'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-95',
        secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
      },
      size: {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    iconOnly?: boolean
    children?: ReactNode
  }

export default function Button({
  className,
  variant,
  size,
  iconOnly = false,
  'aria-label': ariaLabel,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  if (iconOnly && !ariaLabel) {
    throw new Error('Button: `aria-label` is required for icon-only buttons')
  }

  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), iconOnly && 'aspect-square px-0', className)}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  )
}
