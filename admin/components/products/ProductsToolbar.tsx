import { Plus, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'

interface ProductsToolbarProps {
  productsCount: number
  syncing: boolean
  onCreate: () => void
  onSync: () => void
  onRefresh: () => void
}

export default function ProductsToolbar({
  productsCount,
  syncing,
  onCreate,
  onSync,
  onRefresh,
}: ProductsToolbarProps) {
  return (
    <div className="glass-card p-6">
      <div className="flex gap-4 flex-wrap items-center justify-between">
        <div className="flex gap-3 flex-wrap">
          <Button onClick={onCreate} className="bg-gradient-to-r from-green-500 to-emerald-500 shadow-lg hover:shadow-xl">
            <Plus className="w-4 h-4" />
            Добавить
          </Button>
          <Button onClick={onSync} disabled={syncing} className="shadow-lg hover:shadow-xl">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Синхронизация...' : 'Синхронизировать с провайдером'}
          </Button>
          <Button onClick={onRefresh} variant="secondary">
            <RefreshCw className="w-4 h-4" />
            Обновить
          </Button>
        </div>
        <div className="text-sm text-slate-500">
          Всего: <span className="font-bold text-slate-700">{productsCount}</span> тарифов
        </div>
      </div>
    </div>
  )
}
