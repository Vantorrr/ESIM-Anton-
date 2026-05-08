'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import { productsApi, Product } from '@/lib/api'
import { formatPrice, formatDataAmount, getFlagUrl, getCountryName } from '@/lib/utils'
import {
  getCoverageCount,
  getCoverageItems,
  getCoverageScopeLabel,
  getCoverageSummary,
  isGlobalProduct,
  isMultiProduct,
} from '@/lib/productCoverage'


function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
      <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
    </svg>
  )
}

export default function CountryPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const country = decodeURIComponent(params.country as string)
  const initialTab = searchParams.get('tab') === 'unlimited' ? 'unlimited' : 'standard'
  const initialSelected = searchParams.get('selected')
  
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'standard' | 'unlimited'>(initialTab)
  const [selectedProduct, setSelectedProduct] = useState<string | null>(initialSelected)

  // Фильтрация по типу тарифа (используем поле isUnlimited из API)
  const products = allProducts.filter(p => 
    activeTab === 'unlimited' ? p.isUnlimited : !p.isUnlimited
  )

  // Определяем тарифы-«дубли»: одинаковые dataAmount + validityDays + isUnlimited,
  // но разные по цене/провайдеру. Для таких показываем provider name, чтобы
  // пользователь мог их различить. Работает универсально для любой страны.
  const duplicateGroupKeys = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of products) {
      const key = `${p.dataAmount}|${p.validityDays}|${p.isUnlimited}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    const dups = new Set<string>()
    for (const [key, count] of counts) {
      if (count > 1) dups.add(key)
    }
    return dups
  }, [products])

  const isDuplicate = (p: Product) =>
    duplicateGroupKeys.has(`${p.dataAmount}|${p.validityDays}|${p.isUnlimited}`)
  const selectedProd = products.find(p => p.id === selectedProduct) || null
  const selectedCoverageItems = selectedProd ? getCoverageItems(selectedProd).map(getCountryName) : []
  const selectedCoverageCount = selectedProd ? getCoverageCount(selectedProd) : 1
  const showRegionCoverage = Boolean(
    selectedProd &&
    (isMultiProduct(selectedProd) || isGlobalProduct(selectedProd)) &&
    selectedCoverageItems.length > 1
  )

  useEffect(() => {
    const tabFromQuery = searchParams.get('tab')
    const selectedFromQuery = searchParams.get('selected')

    if (tabFromQuery === 'standard' || tabFromQuery === 'unlimited') {
      setActiveTab(tabFromQuery)
    }

    if (selectedFromQuery) {
      setSelectedProduct(selectedFromQuery)
    }
  }, [searchParams])

  // Выбираем первый продукт при смене таба
  useEffect(() => {
    if (products.length === 0) {
      setSelectedProduct(null)
      return
    }

    if (selectedProduct && products.some(product => product.id === selectedProduct)) {
      return
    }

    setSelectedProduct(products[0].id)
  }, [products, selectedProduct])

  const loadProducts = useCallback(async () => {
    try {
      const fetchedProducts = await productsApi.getAll({ isActive: true })
      const countryProducts = fetchedProducts.filter(p => p.country === country)
      // Сортируем по цене
      countryProducts.sort((a, b) => a.ourPrice - b.ourPrice)
      setAllProducts(countryProducts)
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }, [country])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `eSIM для ${country}`,
        text: `Купи eSIM для ${country} от ₽${products[0]?.ourPrice || 0}`,
        url: window.location.href,
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-200/70">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => router.push('/')}
            className="p-2 -ml-2 text-gray-600"
            aria-label="Назад"
          >
            <BackIcon />
          </button>
          <div className="flex items-center gap-2">
            {getFlagUrl(country) ? (
              <img src={getFlagUrl(country)} alt={getCountryName(country)} className="w-8 h-auto rounded shadow-sm" onError={(e) => { (e.target as HTMLImageElement).src = '/logo-mark.png'; (e.target as HTMLImageElement).className = 'w-8 h-8 rounded-lg object-contain'; }} />
            ) : (
              <img src="/logo-mark.png" alt="Mojo mobile" className="w-8 h-8 rounded-lg object-contain" />
            )}
            <span className="font-semibold text-lg">{getCountryName(country)}</span>
          </div>
          <button 
            onClick={handleShare}
            className="p-2 -mr-2 text-gray-600"
            aria-label="Поделиться"
          >
            <ShareIcon />
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {selectedProd && (isMultiProduct(selectedProd) || isGlobalProduct(selectedProd)) && (
          <div className="card-neutral p-4 mb-4 animate-slide-up">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {getCoverageScopeLabel(selectedProd)}
            </p>
            <p className="text-base font-semibold text-gray-900">
              Покрывает {getCoverageSummary(selectedProd)}
            </p>
          </div>
        )}

        {showRegionCoverage && selectedProd && (
          <div className="card-neutral p-4 mb-4 animate-slide-up" style={{ animationDelay: '0.04s' }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Страны в пакете
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {getCoverageSummary(selectedProd)}
                </p>
              </div>
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-[#f77430]">
                {selectedCoverageCount} стран
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {selectedCoverageItems.map(item => (
                <div
                  key={item}
                  className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700"
                >
                  {item}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Перед покупкой сразу видно, какие страны входят в этот региональный пакет.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('standard')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'standard'
                ? 'bg-[#f77430] text-white shadow-md shadow-orange-200'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            Стандартные
          </button>
          <button
            onClick={() => setActiveTab('unlimited')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'unlimited'
                ? 'bg-[#f77430] text-white shadow-md shadow-orange-200'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            Безлимитные
          </button>
        </div>

        {/* Products List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-neutral p-4">
                <div className="flex justify-between items-center">
                  <div className="skeleton h-5 w-24" />
                  <div className="skeleton h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="card-neutral text-center py-10">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-600 font-medium">Тарифы не найдены</p>
          </div>
        ) : (
          <div className="card-neutral overflow-hidden">
            {products.map((product, index) => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product.id)}
                className={`
                  flex items-center justify-between px-4 py-3 cursor-pointer transition-all
                  ${index !== products.length - 1 ? 'border-b border-gray-100' : ''}
                  ${selectedProduct === product.id 
                    ? 'bg-orange-50 border-l-4 border-l-[#f77430]'
                    : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  }
                `}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">
                      {formatDataAmount(product.dataAmount)}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {product.isUnlimited 
                        ? `в день, на ${product.validityDays} дн.`
                        : `на ${product.validityDays} дн.`
                      }
                    </span>
                    {/* Бейдж */}
                    {product.badge && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${
                        product.badgeColor === 'red' ? 'bg-red-500' :
                        product.badgeColor === 'green' ? 'bg-green-500' :
                        product.badgeColor === 'blue' ? 'bg-[#f77430]' :
                        product.badgeColor === 'orange' ? 'bg-orange-500' :
                        'bg-[#f29b41]'
                      }`}>
                        {product.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {product.isUnlimited
                      ? 'Ежедневный пакет интернета'
                      : 'Весь объём интернета на срок тарифа'}
                  </p>
                  {/* Покрытие для мульти/глобальных пакетов */}
                  {(isMultiProduct(product) || isGlobalProduct(product)) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {getCoverageScopeLabel(product)}: {getCoverageSummary(product)}
                    </p>
                  )}
                  {/* Для дублей (одинаковые объём+срок) — показываем теги от backend,
                      чтобы пользователь видел чем тарифы отличаются.
                      Если тегов нет — fallback на провайдерское название. */}
                  {isDuplicate(product) && (() => {
                    const tags = product.tags ?? []
                    if (tags.length > 0) {
                      return (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )
                    }
                    return (
                      <p className="text-xs text-gray-400 mt-0.5 italic">
                        {product.name}
                      </p>
                    )
                  })()}
                  {/* Скорость после лимита для Daily Unlimited */}
                  {product.isUnlimited && product.speed && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      После лимита: {product.speed}
                    </p>
                  )}
                  {/* Примечание из админки */}
                  {product.notes && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {product.notes}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">
                    {formatPrice(product.ourPrice)} ₽
                  </span>
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                    ${selectedProduct === product.id 
                      ? 'border-[#f77430] bg-[#f77430]'
                      : 'border-gray-300'
                    }
                  `}>
                    {selectedProduct === product.id && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tariff Details */}
        {selectedProd && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Что входит в тариф
            </h3>
            <div className="card-neutral divide-y divide-gray-100">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <span className="text-lg">📦</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Интернет</p>
                  <p className="font-medium text-gray-900">
                    {selectedProd.isUnlimited
                      ? `${formatDataAmount(selectedProd.dataAmount)} в день`
                      : `${formatDataAmount(selectedProd.dataAmount)} на весь срок`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <span className="text-lg">📅</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Срок действия</p>
                  <p className="font-medium text-gray-900">
                    {selectedProd.validityDays} дней
                  </p>
                  {selectedProd.description && (
                    <p className="text-xs text-gray-500 mt-1">{selectedProd.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <span className="text-lg">🌍</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 uppercase">Где работает</p>
                  <p className="font-medium text-gray-900">{getCoverageSummary(selectedProd)}</p>
                  {selectedCoverageItems.length > 1 && !showRegionCoverage && (
                    <details className="mt-2 group">
                      <summary className="list-none cursor-pointer text-xs font-medium text-[#f77430]">
                        Показать страны ({selectedCoverageCount})
                      </summary>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedCoverageItems.map(item => (
                          <span
                            key={item}
                            className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <span className="text-lg">📶</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Скорость сети</p>
                  <p className="font-medium text-gray-900">
                    {selectedProd.isUnlimited && selectedProd.speed
                      ? `3G/4G/5G, после лимита ${selectedProd.speed}`
                      : '3G/4G/5G'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <span className="text-lg">📡</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Тип подключения</p>
                  <p className="font-medium text-gray-900">Только данные</p>
                  <p className="text-xs text-gray-500 mt-1">Звонки и SMS в тариф не входят.</p>
                </div>
              </div>
              {((selectedProd.tags && selectedProd.tags.length > 0) || selectedProd.notes) && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
                    <span className="text-lg">ℹ️</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 uppercase">Примечание</p>
                    {selectedProd.tags && selectedProd.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedProd.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] font-medium px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {selectedProd.notes && (
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{selectedProd.notes}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Important Info */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Важно про eSIM
          </h3>
          <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100">
            <p className="text-sm text-amber-800">
              ⚠️ Только мобильный интернет. Звонки и SMS не поддерживаются.
            </p>
          </div>
        </div>

        {/* Buy Button - fixed above bottom nav */}
        {selectedProduct && (
          <>
            <div className="h-28" />
            <div
              className="fixed left-0 right-0 z-[60] px-4"
              style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
            >
              <div className="max-w-lg mx-auto">
                <Link
                  href={`/product/${selectedProduct}?returnTo=${encodeURIComponent(
                    `/country/${encodeURIComponent(country)}?tab=${activeTab}&selected=${selectedProduct}`
                  )}`}
                  className="block w-full py-4 rounded-2xl bg-[#f77430] hover:bg-[#f2622a] text-white font-semibold text-lg transition-colors shadow-lg shadow-orange-500/30 text-center"
                >
                  Далее
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
