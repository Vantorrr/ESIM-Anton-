'use client'

import { useEffect, useState } from 'react'
import { productsApi } from '@/lib/api'
import { Package, Plus, Edit2, Eye, EyeOff, RefreshCw } from 'lucide-react'

export default function Products() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await productsApi.getAll()
      
      // Пробуем разные форматы ответа
      const data = Array.isArray(response.data) 
        ? response.data 
        : response.data?.data || response.data?.products || []
      
      setProducts(data)
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Ошибка загрузки'
      setError(`Ошибка: ${errorMsg}. URL: ${err.config?.url || 'unknown'}`)
      console.error('❌ Ошибка загрузки продуктов:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingProduct({
      country: '',
      region: '',
      name: '',
      description: '',
      dataAmount: '',
      validityDays: 7,
      providerPrice: 0,
      ourPrice: 0,
      providerId: '',
      isActive: true,
    })
    setIsCreating(true)
  }

  const handleEdit = (product: any) => {
    setEditingProduct({ ...product })
    setIsCreating(false)
  }

  const handleSave = async () => {
    try {
      if (isCreating) {
        await productsApi.create(editingProduct)
        alert('Продукт создан!')
      } else {
        await productsApi.update(editingProduct.id, editingProduct)
        alert('Продукт обновлен!')
      }
      
      setEditingProduct(null)
      setIsCreating(false)
      loadProducts()
    } catch (error) {
      console.error('Ошибка сохранения:', error)
      alert('Ошибка сохранения продукта')
    }
  }

  const handleToggleActive = async (product: any) => {
    try {
      await productsApi.update(product.id, { isActive: !product.isActive })
      loadProducts()
    } catch (error) {
      console.error('Ошибка обновления статуса:', error)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Кнопка добавить */}
      <div className="glass-card p-6">
        <div className="flex gap-4 flex-wrap items-center">
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            Добавить продукт
          </button>
          <button
            onClick={loadProducts}
            className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Обновить
          </button>
          <p className="text-sm text-slate-500">
            Продукты синхронизируются автоматически при запуске сервера
          </p>
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="glass-card p-6 bg-red-50 border-red-200">
          <p className="text-red-700 font-medium">{error}</p>
          <button 
            onClick={loadProducts}
            className="mt-2 text-sm text-red-600 underline"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {/* Таблица продуктов */}
      <div className="glass-card p-6">
        <h2 className="text-2xl font-bold mb-6">Продукты (тарифы eSIM)</h2>

        {products.length === 0 && !error ? (
          <div className="text-center py-12 text-slate-500">
            <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg">Пока нет продуктов</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Страна</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Название</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Трафик</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Срок</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Цена поставщика</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Наша цена</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Статус</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700">Действия</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 hover:bg-white/50 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium">
                      {product.country}
                      {product.region && <div className="text-xs text-slate-500">{product.region}</div>}
                    </td>
                    <td className="py-4 px-4">{product.name}</td>
                    <td className="py-4 px-4">{product.dataAmount}</td>
                    <td className="py-4 px-4">{product.validityDays} дней</td>
                    <td className="py-4 px-4">₽{Number(product.providerPrice).toLocaleString()}</td>
                    <td className="py-4 px-4 font-bold text-green-600">
                      ₽{Number(product.ourPrice).toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleActive(product)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          product.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {product.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        {product.isActive ? 'Активен' : 'Скрыт'}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Форма редактирования/создания */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">
              {isCreating ? 'Создать продукт' : 'Редактировать продукт'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Страна */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Страна *</label>
                <input
                  type="text"
                  value={editingProduct.country}
                  onChange={(e) => setEditingProduct({ ...editingProduct, country: e.target.value })}
                  placeholder="США"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              {/* Регион */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Регион</label>
                <input
                  type="text"
                  value={editingProduct.region || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, region: e.target.value })}
                  placeholder="Например: 🇪🇺 30 стран"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              {/* Название */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Название *</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="5GB / 30 дней"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              {/* Описание */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Описание</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  placeholder="Подробное описание тарифа..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              {/* Объем данных */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Объем данных *</label>
                <input
                  type="text"
                  value={editingProduct.dataAmount}
                  onChange={(e) => setEditingProduct({ ...editingProduct, dataAmount: e.target.value })}
                  placeholder="5GB"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              {/* Срок действия */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Срок действия (дней) *</label>
                <input
                  type="number"
                  value={editingProduct.validityDays}
                  onChange={(e) => setEditingProduct({ ...editingProduct, validityDays: +e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              {/* Цена поставщика */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Цена поставщика (₽) *</label>
                <input
                  type="number"
                  value={editingProduct.providerPrice}
                  onChange={(e) => setEditingProduct({ ...editingProduct, providerPrice: +e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              {/* Наша цена */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Наша цена (₽) *</label>
                <input
                  type="number"
                  value={editingProduct.ourPrice}
                  onChange={(e) => setEditingProduct({ ...editingProduct, ourPrice: +e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Наценка: {editingProduct.providerPrice > 0 
                    ? `${(((editingProduct.ourPrice - editingProduct.providerPrice) / editingProduct.providerPrice) * 100).toFixed(1)}%`
                    : '0%'}
                </p>
              </div>

              {/* Provider ID */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Provider ID *</label>
                <input
                  type="text"
                  value={editingProduct.providerId}
                  onChange={(e) => setEditingProduct({ ...editingProduct, providerId: e.target.value })}
                  placeholder="usa_5gb_30d"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <p className="text-sm text-slate-500 mt-1">
                  ID пакета у провайдера eSIM
                </p>
              </div>

              {/* Активен */}
              <div className="col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.isActive}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isActive: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <span className="font-medium text-lg">Показывать продукт в каталоге</span>
                </label>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 pt-6">
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Сохранить
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null)
                  setIsCreating(false)
                }}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
