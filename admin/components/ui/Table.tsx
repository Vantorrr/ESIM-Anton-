import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full text-sm', className)} {...props} />
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn(className)} {...props} />
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(className)} {...props} />
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn(className)} {...props} />
}

export function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('text-left py-3 px-4 font-semibold text-slate-700', className)} {...props} />
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('py-4 px-4', className)} {...props} />
}

interface SortableHeaderProps {
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
  children: ReactNode
  className?: string
}

export function SortableHeader({ active, direction, onClick, children, className }: SortableHeaderProps) {
  return (
    <TableHeaderCell
      onClick={onClick}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('cursor-pointer select-none hover:text-blue-600 transition-colors', className)}
    >
      {children}
      {active ? (
        <span className="ml-1 text-blue-600">{direction === 'asc' ? '↑' : '↓'}</span>
      ) : (
        <span className="ml-1 text-slate-300">↕</span>
      )}
    </TableHeaderCell>
  )
}
