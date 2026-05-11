import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

interface BulkMarkupModalProps {
  selectedCount: number
  bulkMarkup: number
  exchangeRate: number
  onMarkupChange: (value: number) => void
  onApply: () => void
  onClose: () => void
}

export default function BulkMarkupModal(props: BulkMarkupModalProps) {
  const { selectedCount, bulkMarkup, exchangeRate, onMarkupChange, onApply, onClose } = props

  return (
    <Modal title={`Изменить наценку для ${selectedCount} продуктов`} onClose={onClose} contentClassName="max-w-md">
      <div className="space-y-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Наценка (%)</label>
            <input
              type="number"
              value={bulkMarkup}
              onChange={(event) => onMarkupChange(Number(event.target.value))}
              min={0}
              max={500}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-2xl font-bold text-center"
            />
            <p className="text-xs text-slate-500 mt-1">
              Формула: (Цена провайдера USD × (1 + наценка/100)) × курс {exchangeRate}₽
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[10, 20, 30, 50, 75, 100, 150, 200].map((value) => (
              <button
                key={value}
                onClick={() => onMarkupChange(value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${bulkMarkup === value ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                +{value}%
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={onApply}>Применить</Button>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
        </div>
      </div>
    </Modal>
  )
}
