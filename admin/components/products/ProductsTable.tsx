import type { AdminProduct } from '@/lib/types'
import Button from '@/components/ui/Button'
import { Table, TableBody, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table'
import { Package } from 'lucide-react'
import ProductsTableRow from './ProductsTableRow'

interface ProductsTableProps {
  filteredProducts: AdminProduct[]
  selectedIds: Set<string>
  exchangeRate: number
  error: string | null
  onRetry: () => void
  onSelectAll: () => void
  onSelectOne: (id: string) => void
  onView: (product: AdminProduct) => void
  onEdit: (product: AdminProduct) => void
  onToggleActive: (product: AdminProduct) => void
  getProviderPriceUSD: (providerPrice: number | string) => number
  getMarkupPercent: (providerPrice: number | string, ourPrice: number | string) => number
}

export default function ProductsTable(props: ProductsTableProps) {
  const { filteredProducts, selectedIds, exchangeRate, error, onRetry, onSelectAll, onSelectOne, onView, onEdit, onToggleActive, getProviderPriceUSD, getMarkupPercent } = props

  return (
    <div className="glass-card glass-card--static p-6">
      <h2 className="text-2xl font-bold mb-6">Продукты (тарифы eSIM)</h2>
      {error ? (
        <div className="glass-card p-6 bg-red-50 border-red-200">
          <p className="text-red-700 font-medium">{error}</p>
          <Button onClick={onRetry} variant="ghost" size="sm" className="mt-2 px-0 text-red-600 hover:bg-transparent hover:text-red-700">
            Попробовать снова
          </Button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="text-lg">Нет продуктов по выбранным фильтрам</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow className="border-b-2 border-slate-300 bg-slate-50">
                <TableHeaderCell className="w-10 px-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded"
                  />
                </TableHeaderCell>
                <TableHeaderCell className="px-2">Name</TableHeaderCell>
                <TableHeaderCell className="px-2">Цена поставщика</TableHeaderCell>
                <TableHeaderCell className="px-2">Data ⇅</TableHeaderCell>
                <TableHeaderCell className="px-2">Duration ⇅</TableHeaderCell>
                <TableHeaderCell className="px-2">Себестоимость / GB</TableHeaderCell>
                <TableHeaderCell className="px-2">Наша цена</TableHeaderCell>
                <TableHeaderCell className="px-2">Наценка</TableHeaderCell>
                <TableHeaderCell className="px-2">Speed</TableHeaderCell>
                <TableHeaderCell className="px-2">Region</TableHeaderCell>
                <TableHeaderCell className="px-2">Тип</TableHeaderCell>
                <TableHeaderCell className="px-2">Бейдж</TableHeaderCell>
                <TableHeaderCell className="px-2">Статус</TableHeaderCell>
                <TableHeaderCell className="px-2" />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product) => (
                <ProductsTableRow
                  key={product.id}
                  product={product}
                  exchangeRate={exchangeRate}
                  selected={selectedIds.has(product.id)}
                  onSelect={onSelectOne}
                  onView={onView}
                  onEdit={onEdit}
                  onToggleActive={onToggleActive}
                  getProviderPriceUSD={getProviderPriceUSD}
                  getMarkupPercent={getMarkupPercent}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
