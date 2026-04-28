'use client'

import { useEffect, useState } from 'react'
import { productsApi, systemSettingsApi } from '@/lib/api'
import { Package, Plus, Edit2, Eye, EyeOff, RefreshCw, Check, X, Tag, Percent, Filter, ChevronDown, Search } from 'lucide-react'

export default function Products() {
  const [products, setProducts] = useState<any[]>([])
  const [filteredProducts, setFilteredProducts] = useState<any[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Фильтры
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [showActiveOnly, setShowActiveOnly] = useState<boolean | null>(null)
  const [tariffType, setTariffType] = useState<'all' | 'standard' | 'unlimited'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Массовый выбор
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Модальные окна для массовых действий
  const [showBulkBadgeModal, setShowBulkBadgeModal] = useState(false)
  const [showBulkMarkupModal, setShowBulkMarkupModal] = useState(false)
  const [bulkBadge, setBulkBadge] = useState('')
  const [bulkBadgeColor, setBulkBadgeColor] = useState('')
  const [bulkMarkup, setBulkMarkup] = useState(30)
  const [exchangeRate, setExchangeRate] = useState(95)
  const [editingProviderPriceUsd, setEditingProviderPriceUsd] = useState('0.00')
  const [editingMarkupPercent, setEditingMarkupPercent] = useState('0')

  // Детальный просмотр тарифа
  const [viewingProduct, setViewingProduct] = useState<any>(null)

  useEffect(() => {
    loadProducts()
    loadCountries()
    loadPricingSettings()
  }, [])

  const getProviderPriceUSD = (providerPrice: number | string) => Number(providerPrice) / 10000
  const getMarkupPercent = (providerPrice: number | string, ourPrice: number | string) => {
    const providerPriceUSD = getProviderPriceUSD(providerPrice)
    const ourPriceRUB = Number(ourPrice)
    if (!providerPriceUSD || !exchangeRate) return 0
    return ((ourPriceRUB / (providerPriceUSD * exchangeRate)) - 1) * 100
  }
  const formatMarkupInput = (providerPrice: number | string, ourPrice: number | string) =>
    Math.round(getMarkupPercent(providerPrice, ourPrice)).toString()

  // Фильтрация продуктов
  useEffect(() => {
    let result = [...products]

    // Фильтр по стране
    if (selectedCountry) {
      result = result.filter(p => p.country === selectedCountry)
    }

    // Фильтр по активности
    if (showActiveOnly !== null) {
      result = result.filter(p => p.isActive === showActiveOnly)
    }

    // Фильтр по типу тарифа (стандартный/безлимитный)
    if (tariffType === 'standard') {
      result = result.filter(p => !p.isUnlimited)
    } else if (tariffType === 'unlimited') {
      result = result.filter(p => p.isUnlimited)
    }

    // Поиск по названию
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.country?.toLowerCase().includes(query) ||
        p.dataAmount?.toLowerCase().includes(query)
      )
    }

    setFilteredProducts(result)
  }, [products, selectedCountry, showActiveOnly, tariffType, searchQuery])

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await productsApi.getAll()
      
      const data = Array.isArray(response.data) 
        ? response.data 
        : response.data?.data || response.data?.products || []
      
      setProducts(data)
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Ошибка загрузки'
      setError(`Ошибка: ${errorMsg}`)
      console.error('❌ Ошибка загрузки продуктов:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCountries = async () => {
    try {
      const response = await productsApi.getCountries()
      const data = Array.isArray(response.data) ? response.data : []
      setCountries(data)
    } catch (err) {
      console.error('❌ Ошибка загрузки стран:', err)
    }
  }

  const loadPricingSettings = async () => {
    try {
      const response = await systemSettingsApi.getPricingSettings()
      if (response.data?.exchangeRate) {
        setExchangeRate(Number(response.data.exchangeRate))
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки настроек ценообразования:', err)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      const response = await productsApi.sync()
      alert(`✅ ${response.data.message}`)
      loadProducts()
      loadCountries()
    } catch (err: any) {
      alert('❌ Ошибка синхронизации: ' + (err.response?.data?.message || err.message))
    } finally {
      setSyncing(false)
    }
  }

  const closeEditor = () => {
    setEditingProduct(null)
    setIsCreating(false)
    setEditingProviderPriceUsd('0.00')
    setEditingMarkupPercent('0')
  }

  const handleCreate = () => {
    const nextProduct = {
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
    }
    setEditingProduct(nextProduct)
    setEditingProviderPriceUsd('0.00')
    setEditingMarkupPercent('0')
    setIsCreating(true)
  }

  const handleEdit = (product: any) => {
    setEditingProduct({ ...product })
    setEditingProviderPriceUsd(getProviderPriceUSD(product.providerPrice).toFixed(2))
    setEditingMarkupPercent(formatMarkupInput(product.providerPrice, product.ourPrice))
    setIsCreating(false)
  }

  const handleProviderPriceUsdChange = (value: string) => {
    const normalized = value.replace(',', '.')
    setEditingProviderPriceUsd(normalized)

    const numericValue = Number.parseFloat(normalized)
    const nextProviderPrice = Number.isFinite(numericValue) ? Math.round(numericValue * 10000) : 0

    setEditingProduct((prev: any) => {
      if (!prev) return prev
      const nextProduct = { ...prev, providerPrice: nextProviderPrice }
      setEditingMarkupPercent(formatMarkupInput(nextProduct.providerPrice, nextProduct.ourPrice))
      return nextProduct
    })
  }

  const handleOurPriceChange = (value: string) => {
    const nextOurPrice = Number(value) || 0
    setEditingProduct((prev: any) => {
      if (!prev) return prev
      const nextProduct = { ...prev, ourPrice: nextOurPrice }
      setEditingMarkupPercent(formatMarkupInput(nextProduct.providerPrice, nextProduct.ourPrice))
      return nextProduct
    })
  }

  const applyMarkupToEditingProduct = (markupValue?: number) => {
    if (!editingProduct) return

    const resolvedMarkup = typeof markupValue === 'number'
      ? markupValue
      : Number.parseFloat(editingMarkupPercent.replace(',', '.'))

    if (!Number.isFinite(resolvedMarkup)) {
      alert('Введите корректную наценку в процентах')
      return
    }

    const providerPriceUSD = getProviderPriceUSD(editingProduct.providerPrice)
    const nextOurPrice = Math.round(providerPriceUSD * (1 + resolvedMarkup / 100) * exchangeRate)

    setEditingProduct({ ...editingProduct, ourPrice: nextOurPrice })
    setEditingMarkupPercent(String(resolvedMarkup))
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
      
      closeEditor()
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

  // =====================================================
  // МАССОВЫЕ ОПЕРАЦИИ
  // =====================================================

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)))
    }
  }

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const handleBulkActivate = async () => {
    if (selectedIds.size === 0) return
    try {
      const response = await productsApi.bulkToggleActive(Array.from(selectedIds), true)
      alert(`✅ ${response.data.message}`)
      setSelectedIds(new Set())
      loadProducts()
    } catch (err: any) {
      alert('❌ Ошибка: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0) return
    try {
      const response = await productsApi.bulkToggleActive(Array.from(selectedIds), false)
      alert(`✅ ${response.data.message}`)
      setSelectedIds(new Set())
      loadProducts()
    } catch (err: any) {
      alert('❌ Ошибка: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleBulkToggleByType = async (tariffType: 'standard' | 'unlimited', isActive: boolean) => {
    const typeName = tariffType === 'unlimited' ? 'безлимитные' : 'стандартные'
    const action = isActive ? 'включить' : 'выключить'
    
    if (!confirm(`${isActive ? '🟢' : '🔴'} Вы уверены, что хотите ${action} ВСЕ ${typeName} тарифы?`)) {
      return
    }
    
    try {
      const response = await productsApi.bulkToggleByType(tariffType, isActive)
      alert(`✅ ${response.data.message}`)
      loadProducts()
    } catch (err: any) {
      alert('❌ Ошибка: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleBulkSetBadge = async () => {
    if (selectedIds.size === 0) return
    try {
      const badge = bulkBadge.trim() || null
      const badgeColor = bulkBadgeColor || null
      const response = await productsApi.bulkSetBadge(Array.from(selectedIds), badge, badgeColor)
      alert(`✅ ${response.data.message}`)
      setShowBulkBadgeModal(false)
      setBulkBadge('')
      setBulkBadgeColor('')
      setSelectedIds(new Set())
      loadProducts()
    } catch (err: any) {
      alert('❌ Ошибка: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleBulkSetMarkup = async () => {
    if (selectedIds.size === 0) return
    try {
      const response = await productsApi.bulkSetMarkup(Array.from(selectedIds), bulkMarkup)
      alert(`✅ ${response.data.message}`)
      setShowBulkMarkupModal(false)
      setBulkMarkup(30)
      setSelectedIds(new Set())
      loadProducts()
    } catch (err: any) {
      alert('❌ Ошибка: ' + (err.response?.data?.message || err.message))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
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
      {/* Панель управления */}
      <div className="glass-card p-6">
        <div className="flex gap-4 flex-wrap items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Добавить
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Синхронизация...' : 'Синхронизировать с провайдером'}
            </button>
            <button
              onClick={loadProducts}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Обновить
            </button>
          </div>
          <div className="text-sm text-slate-500">
            Всего: <span className="font-bold text-slate-700">{products.length}</span> тарифов
          </div>
        </div>
      </div>

      {/* Фильтры */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-500" />
          <h3 className="font-semibold text-lg">Фильтры</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>

          {/* Фильтр по стране */}
          <div className="relative">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white"
            >
              <option value="">Все страны ({countries.length})</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Фильтр по статусу */}
          <div className="relative">
            <select
              value={showActiveOnly === null ? '' : showActiveOnly ? 'active' : 'inactive'}
              onChange={(e) => {
                if (e.target.value === '') setShowActiveOnly(null)
                else if (e.target.value === 'active') setShowActiveOnly(true)
                else setShowActiveOnly(false)
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white"
            >
              <option value="">Все статусы</option>
              <option value="active">✅ Только активные</option>
              <option value="inactive">⏸️ Только скрытые</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Фильтр по типу тарифа */}
          <div className="relative">
            <select
              value={tariffType}
              onChange={(e) => setTariffType(e.target.value as 'all' | 'standard' | 'unlimited')}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white"
            >
              <option value="all">📦 Все типы тарифов</option>
              <option value="standard">📊 Стандартные (с лимитом ГБ)</option>
              <option value="unlimited">♾️ Безлимитные (Day Pass)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Сброс фильтров */}
          <button
            onClick={() => {
              setSelectedCountry('')
              setShowActiveOnly(null)
              setTariffType('all')
              setSearchQuery('')
            }}
            className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
          >
            Сбросить фильтры
          </button>
        </div>

        {/* Статистика по фильтру */}
        <div className="mt-4 flex gap-4 flex-wrap text-sm text-slate-500">
          <span>Показано: <strong className="text-slate-700">{filteredProducts.length}</strong></span>
          <span>Активных: <strong className="text-green-600">{filteredProducts.filter(p => p.isActive).length}</strong></span>
          <span>Скрытых: <strong className="text-slate-400">{filteredProducts.filter(p => !p.isActive).length}</strong></span>
          <span className="border-l border-slate-300 pl-4">📊 Стандартных: <strong className="text-blue-600">{products.filter(p => !p.isUnlimited).length}</strong></span>
          <span>♾️ Безлимитных: <strong className="text-purple-600">{products.filter(p => p.isUnlimited).length}</strong></span>
        </div>

        {/* Быстрые действия по типу тарифа */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h4 className="font-semibold text-slate-700 mb-3">⚡ Быстрые действия (одной кнопкой)</h4>
          <div className="flex gap-3 flex-wrap">
            {/* Стандартные тарифы */}
            <div className="flex gap-2 items-center">
              <span className="text-sm text-slate-600 font-medium">📊 Стандартные:</span>
              <button
                onClick={() => handleBulkToggleByType('standard', true)}
                className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-all flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                Включить все
              </button>
              <button
                onClick={() => handleBulkToggleByType('standard', false)}
                className="px-3 py-1.5 bg-slate-400 text-white rounded-lg text-sm font-medium hover:bg-slate-500 transition-all flex items-center gap-1"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Выключить все
              </button>
            </div>

            <div className="w-px bg-slate-300 mx-2"></div>

            {/* Безлимитные тарифы */}
            <div className="flex gap-2 items-center">
              <span className="text-sm text-slate-600 font-medium">♾️ Безлимитные:</span>
              <button
                onClick={() => handleBulkToggleByType('unlimited', true)}
                className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-all flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                Включить все
              </button>
              <button
                onClick={() => handleBulkToggleByType('unlimited', false)}
                className="px-3 py-1.5 bg-slate-400 text-white rounded-lg text-sm font-medium hover:bg-slate-500 transition-all flex items-center gap-1"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Выключить все
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Панель массовых действий */}
      {selectedIds.size > 0 && (
        <div className="glass-card p-4 bg-blue-50 border-blue-200 sticky top-0 z-40">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                Выбрано: {selectedIds.size}
              </div>
              <button
                onClick={clearSelection}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Снять выделение
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleBulkActivate}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-all text-sm"
              >
                <Eye className="w-4 h-4" />
                Активировать
              </button>
              <button
                onClick={handleBulkDeactivate}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-500 text-white rounded-lg font-medium hover:bg-slate-600 transition-all text-sm"
              >
                <EyeOff className="w-4 h-4" />
                Деактивировать
              </button>
              <button
                onClick={() => setShowBulkBadgeModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-all text-sm"
              >
                <Tag className="w-4 h-4" />
                Установить бейдж
              </button>
              <button
                onClick={() => setShowBulkMarkupModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-all text-sm"
              >
                <Percent className="w-4 h-4" />
                Изменить наценку
              </button>
            </div>
          </div>
        </div>
      )}

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

        {filteredProducts.length === 0 && !error ? (
          <div className="text-center py-12 text-slate-500">
            <Package className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="text-lg">Нет продуктов по выбранным фильтрам</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-50">
                  <th className="text-left py-3 px-2 font-semibold text-slate-700 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded"
                    />
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700">Name</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700">Цена поставщика</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700">Data ⇅</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700">Duration ⇅</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700">Себестоимость / GB</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700">Наша цена</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700">Наценка</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700">Speed</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700">Region</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700">Тип</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700">Бейдж</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700">Статус</th>
                  <th className="text-left py-3 px-2 font-semibold text-slate-700"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const providerPriceUSD = getProviderPriceUSD(product.providerPrice)
                  const providerPriceRUB = providerPriceUSD * exchangeRate
                  const ourPriceRUB = Number(product.ourPrice)
                  const markup = getMarkupPercent(product.providerPrice, product.ourPrice)
                  
                  // Извлекаем числовое значение GB из dataAmount
                  const dataMatch = product.dataAmount?.match(/(\d+(\.\d+)?)\s*(GB|MB)/i)
                  let dataInGB = 0
                  if (dataMatch) {
                    const value = parseFloat(dataMatch[1])
                    const unit = dataMatch[3].toUpperCase()
                    dataInGB = unit === 'GB' ? value : value / 1024
                  }
                  const perGB = dataInGB > 0 ? providerPriceRUB / dataInGB : 0
                  
                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${
                        selectedIds.has(product.id) ? 'bg-blue-100' : ''
                      } ${!product.isActive ? 'opacity-50' : ''}`}
                    >
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product.id)}
                          onChange={() => handleSelectOne(product.id)}
                          className="w-4 h-4 rounded"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🌍</span>
                            <button
                              onClick={() => setViewingProduct(product)}
                              className="font-medium text-blue-600 hover:underline text-left"
                            >
                              {product.name}
                            </button>
                          </div>
                          {Array.isArray(product.tags) && product.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 ml-7">
                              {product.tags.slice(0, 3).map((tag: string) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                              {product.tags.length > 3 && (
                                <span className="text-[10px] text-slate-400">
                                  +{product.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 font-semibold">
                        <div className="font-semibold text-slate-800">₽{Math.round(providerPriceRUB).toLocaleString()}</div>
                        <div className="text-xs text-slate-500">${providerPriceUSD.toFixed(2)}</div>
                      </td>
                      <td className="py-2 px-2 font-medium">{product.dataAmount}</td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">📅</span>
                          <span>{product.validityDays}</span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-slate-600">
                        <div>₽{Math.round(perGB).toLocaleString()}</div>
                        <div className="text-xs text-slate-500">по курсу {exchangeRate}₽/$</div>
                      </td>
                      <td className="py-2 px-2 font-bold text-green-600">
                        ₽{Math.round(ourPriceRUB).toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-sm">
                        <span className={`font-medium ${markup > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                          +{markup.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          3G/4G/5G
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-600 text-xs">
                        {product.country}
                      </td>
                      <td className="py-2 px-2">
                        {product.isUnlimited ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                            ∞ Безлимит
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                            Стандарт
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {product.badge ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                            product.badgeColor === 'red' ? 'bg-red-500' :
                            product.badgeColor === 'green' ? 'bg-green-500' :
                            product.badgeColor === 'blue' ? 'bg-blue-500' :
                            product.badgeColor === 'orange' ? 'bg-orange-500' :
                            'bg-purple-500'
                          }`}>
                            {product.badge}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            product.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                          }`}
                        >
                          {product.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {product.isActive ? 'Вкл' : 'Выкл'}
                        </button>
                      </td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно - Массовый бейдж */}
      {showBulkBadgeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-6">Установить бейдж для {selectedIds.size} продуктов</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Текст бейджа</label>
                <input
                  type="text"
                  value={bulkBadge}
                  onChange={(e) => setBulkBadge(e.target.value)}
                  placeholder="ХИТ, -25%, NEW, АКЦИЯ..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">Оставьте пустым чтобы удалить бейдж</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Цвет бейджа</label>
                <select
                  value={bulkBadgeColor}
                  onChange={(e) => setBulkBadgeColor(e.target.value)}
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
              <button
                onClick={handleBulkSetBadge}
                className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-all"
              >
                Применить
              </button>
              <button
                onClick={() => setShowBulkBadgeModal(false)}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно - Массовая наценка */}
      {showBulkMarkupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card p-8 max-w-md w-full">
            <h3 className="text-xl font-bold mb-6">Изменить наценку для {selectedIds.size} продуктов</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Наценка (%)</label>
                <input
                  type="number"
                  value={bulkMarkup}
                  onChange={(e) => setBulkMarkup(Number(e.target.value))}
                  min={0}
                  max={500}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-2xl font-bold text-center"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Формула: (Цена провайдера USD × (1 + наценка/100)) × курс {exchangeRate}₽
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[10, 20, 30, 50, 75, 100, 150, 200].map((val) => (
                  <button
                    key={val}
                    onClick={() => setBulkMarkup(val)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      bulkMarkup === val 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    +{val}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleBulkSetMarkup}
                className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-all"
              >
                Применить
              </button>
              <button
                onClick={() => setShowBulkMarkupModal(false)}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

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
                <label className="block text-sm font-medium text-slate-700 mb-2">Цена поставщика (USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingProviderPriceUsd}
                  onChange={(e) => handleProviderPriceUsdChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Внутри хранится как `1/10000 USD`: {Number(editingProduct.providerPrice).toLocaleString()}
                </p>
              </div>

              {/* Наша цена */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Наша цена (₽) *</label>
                <input
                  type="number"
                  value={editingProduct.ourPrice}
                  onChange={(e) => handleOurPriceChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Текущая наценка: {getMarkupPercent(editingProduct.providerPrice, editingProduct.ourPrice).toFixed(0)}%
                </p>
              </div>

              <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Пересчитать по наценке (%)</label>
                    <input
                      type="number"
                      value={editingMarkupPercent}
                      onChange={(e) => setEditingMarkupPercent(e.target.value)}
                      className="w-40 px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => applyMarkupToEditingProduct()}
                    className="px-5 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all"
                  >
                    Применить наценку
                  </button>
                </div>
                <p className="text-sm text-slate-500 mt-3">
                  Формула: ${getProviderPriceUSD(editingProduct.providerPrice).toFixed(2)} × (1 + {editingMarkupPercent || '0'}/100) × {exchangeRate}₽
                </p>
                <div className="flex gap-2 flex-wrap mt-3">
                  {[30, 50, 100, 150, 200].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => applyMarkupToEditingProduct(val)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 font-medium hover:bg-blue-100 transition-all"
                    >
                      +{val}%
                    </button>
                  ))}
                </div>
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
              </div>

              {/* Бейдж */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">🏷️ Бейдж</label>
                <input
                  type="text"
                  value={editingProduct.badge || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value || null })}
                  placeholder="ХИТ, -25%, NEW"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>

              {/* Цвет бейджа */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">🎨 Цвет бейджа</label>
                <select
                  value={editingProduct.badgeColor || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, badgeColor: e.target.value || null })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                >
                  <option value="">По умолчанию (фиолетовый)</option>
                  <option value="red">🔴 Красный</option>
                  <option value="green">🟢 Зеленый</option>
                  <option value="blue">🔵 Синий</option>
                  <option value="orange">🟠 Оранжевый</option>
                </select>
              </div>

              {/* Теги — короткие пометки для клиентов */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  🏷️ Теги (через запятую)
                </label>
                <input
                  type="text"
                  value={Array.isArray(editingProduct.tags) ? editingProduct.tags.join(', ') : ''}
                  onChange={(e) => {
                    const tags = e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                    setEditingProduct({ ...editingProduct, tags })
                  }}
                  placeholder="Например: Материковый Китай, Не гонконгский IP, 5G"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Эти пометки видит клиент в карточке тарифа. При синхронизации с провайдером не затираются.
                </p>
              </div>

              {/* Примечание — длинный комментарий */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  📝 Примечание
                </label>
                <textarea
                  value={editingProduct.notes || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, notes: e.target.value || null })}
                  placeholder="Особенности активации, ограничения, прочие пояснения..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
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
                  closeEditor()
                }}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно - Детали тарифа (как у eSIM Access) */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-slate-800">Plan Details</h3>
              <button
                onClick={() => setViewingProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Name:</span>
                    <span className="font-medium text-slate-800">{viewingProduct.name}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Slug:</span>
                    <span className="text-slate-700">{viewingProduct.country}_{viewingProduct.dataAmount?.replace(/\s/g, '')}_{viewingProduct.validityDays}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Data type:</span>
                    <span className="text-blue-600 font-medium">
                      {viewingProduct.isUnlimited ? 'Daily Unlimited' : 'Data in Total'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Cost:</span>
                    <div>
                      <div className="font-bold text-slate-800">₽{Math.round(getProviderPriceUSD(viewingProduct.providerPrice) * exchangeRate).toLocaleString()}</div>
                      <div className="text-xs text-slate-500">${getProviderPriceUSD(viewingProduct.providerPrice).toFixed(2)} по курсу {exchangeRate}₽/$</div>
                    </div>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Region type:</span>
                    <span className="text-slate-700">Single</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Top up type:</span>
                    <span className="text-slate-700 text-sm">Data Reloadable for same area within validity</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Validity:</span>
                    <span className="text-slate-700">180 Days</span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Code:</span>
                    <span className="text-slate-700">{viewingProduct.providerId}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Data:</span>
                    <span className="font-medium text-slate-800">{viewingProduct.dataAmount}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Duration:</span>
                    <span className="text-blue-600 font-medium">{viewingProduct.validityDays} Days</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Billing starts:</span>
                    <span className="text-slate-700">First connection</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Region:</span>
                    <span className="text-slate-700">{viewingProduct.country}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-slate-500 text-sm">Breakout IP:</span>
                    <span className="text-slate-700">Local</span>
                  </div>
                </div>
              </div>

              {/* Наши настройки */}
              <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <h4 className="font-bold text-slate-700 mb-4">⚙️ Наши настройки</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-slate-500">Наша цена:</span>
                    <div className="text-xl font-bold text-green-600">₽{Math.round(Number(viewingProduct.ourPrice)).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">Наценка:</span>
                    <div className="text-xl font-bold text-blue-600">
                      +{getMarkupPercent(viewingProduct.providerPrice, viewingProduct.ourPrice).toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">Статус:</span>
                    <div className={`text-xl font-bold ${viewingProduct.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                      {viewingProduct.isActive ? '✅ Активен' : '⏸️ Скрыт'}
                    </div>
                  </div>
                </div>
                {viewingProduct.badge && (
                  <div className="mt-3">
                    <span className="text-sm text-slate-500">Бейдж: </span>
                    <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${
                      viewingProduct.badgeColor === 'red' ? 'bg-red-500' :
                      viewingProduct.badgeColor === 'green' ? 'bg-green-500' :
                      viewingProduct.badgeColor === 'blue' ? 'bg-blue-500' :
                      viewingProduct.badgeColor === 'orange' ? 'bg-orange-500' :
                      'bg-purple-500'
                    }`}>
                      {viewingProduct.badge}
                    </span>
                  </div>
                )}
              </div>

              {/* Coverage and networks */}
              <div className="mt-6">
                <h4 className="text-sm text-slate-500 mb-3">Coverage and networks</h4>
                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🌍</span>
                    <span className="font-medium">{viewingProduct.country}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">4G</span>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">LTE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t bg-slate-50">
              <button
                onClick={() => {
                  setEditingProduct(viewingProduct)
                  setViewingProduct(null)
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                ✏️ Редактировать
              </button>
              <button
                onClick={() => setViewingProduct(null)}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-all"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
