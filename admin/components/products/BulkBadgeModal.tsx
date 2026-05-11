import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

interface BulkBadgeModalProps {
  selectedCount: number
  bulkBadge: string
  bulkBadgeColor: string
  onBadgeChange: (value: string) => void
  onBadgeColorChange: (value: string) => void
  onApply: () => void
  onClose: () => void
}

export default function BulkBadgeModal(props: BulkBadgeModalProps) {
  const { selectedCount, bulkBadge, bulkBadgeColor, onBadgeChange, onBadgeColorChange, onApply, onClose } = props

  return (
    <Modal title={`Установить бейдж для ${selectedCount} продуктов`} onClose={onClose} contentClassName="max-w-md">
      <div className="space-y-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Текст бейджа</label>
            <input
              type="text"
              value={bulkBadge}
              onChange={(event) => onBadgeChange(event.target.value)}
              placeholder="ХИТ, -25%, NEW, АКЦИЯ..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">Оставьте пустым чтобы удалить бейдж</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Цвет бейджа</label>
            <select
              value={bulkBadgeColor}
              onChange={(event) => onBadgeColorChange(event.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              <option value="">По умолчанию (фиолетовый)</option>
              <option value="red">🔴 Красный</option>
              <option value="green">🟢 Зеленый</option>
              <option value="blue">🔵 Синий</option>
              <option value="orange">🟠 Оранжевый</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button className="flex-1 bg-purple-500 hover:bg-purple-600" onClick={onApply}>Применить</Button>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
        </div>
      </div>
    </Modal>
  )
}
