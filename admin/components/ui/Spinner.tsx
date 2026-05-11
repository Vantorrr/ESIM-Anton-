import { cn } from '@/lib/utils'

interface SpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  centered?: boolean
}

const sizeClasses = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
}

export default function Spinner({ className, size = 'lg', centered = false }: SpinnerProps) {
  const spinner = (
    <div
      className={cn(
        'animate-spin rounded-full border-blue-500 border-b-transparent',
        sizeClasses[size],
        className,
      )}
      aria-hidden="true"
    />
  )

  if (!centered) return spinner

  return <div className="flex items-center justify-center h-64">{spinner}</div>
}
