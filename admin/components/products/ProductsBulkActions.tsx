import { Eye, EyeOff, Percent, Tag } from 'lucide-react'
import Button from '@/components/ui/Button'

interface ProductsBulkActionsProps {
  selectedCount: number
  onClear: () => void
  onActivate: () => void
  onDeactivate: () => void
  onOpenBadgeModal: () => void
  onOpenMarkupModal: () => void
}

export default function ProductsBulkActions(props: ProductsBulkActionsProps) {
  const { selectedCount, onClear, onActivate, onDeactivate, onOpenBadgeModal, onOpenMarkupModal } = props

  if (selectedCount === 0) return null

  return (
    <div className="glass-card p-4 bg-blue-50 border-blue-200 sticky top-0 z-40">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            Выбрано: {selectedCount}
          </div>
          <button onClick={onClear} className="text-sm text-slate-500 hover:text-slate-700">
            Снять выделение
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={onActivate} size="sm" className="bg-green-500 hover:bg-green-600">
            <Eye className="w-4 h-4" />
            Активировать
          </Button>
          <Button onClick={onDeactivate} size="sm" className="bg-slate-500 hover:bg-slate-600">
            <EyeOff className="w-4 h-4" />
            Деактивировать
          </Button>
          <Button onClick={onOpenBadgeModal} size="sm" className="bg-purple-500 hover:bg-purple-600">
            <Tag className="w-4 h-4" />
            Установить бейдж
          </Button>
          <Button onClick={onOpenMarkupModal} size="sm" className="bg-orange-500 hover:bg-orange-600">
            <Percent className="w-4 h-4" />
            Изменить наценку
          </Button>
        </div>
      </div>
    </div>
  )
}
