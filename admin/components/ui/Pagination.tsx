import Button from './Button'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <Button variant="secondary" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
        Назад
      </Button>
      <span className="px-4 py-2 text-sm text-slate-600">
        Страница {page} из {totalPages}
      </span>
      <Button
        variant="secondary"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        Вперед
      </Button>
    </div>
  )
}
