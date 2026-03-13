'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Share2 } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { productsApi, Product } from '@/lib/api'
import { formatPrice, formatDataAmount, getFlagUrl, getCountryName } from '@/lib/utils'

export default function CountryPage() {
  const params = useParams()
  const router = useRouter()
  const country = decodeURIComponent(params.country as string)
  
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'standard' | 'unlimited'>('standard')
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [country])

  // Фильтрация по типу тарифа (используем поле isUnlimited из API)
  const products = allProducts.filter(p => 
    activeTab === 'unlimited' ? p.isUnlimited : !p.isUnlimited
  )

  // Выбираем первый продукт при смене таба
  useEffect(() => {
    if (products.length > 0) {
      setSelectedProduct(products[0].id)
    } else {
      setSelectedProduct(null)
    }
  }, [activeTab, allProducts])

  const loadProducts = async () => {
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
  }

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
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600"
          >
            <ArrowLeft size={24} />
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
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
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
                  flex items-center justify-between px-4 py-4 cursor-pointer transition-all
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
                  {/* Скорость после лимита для Daily Unlimited */}
                  {product.isUnlimited && product.speed && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      После лимита: {product.speed}
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
        {products.length > 0 && (() => {
          const selectedProd = products.find(p => p.id === selectedProduct);
          return (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Особенности тарифа
              </h3>
              <div className="card-neutral divide-y divide-gray-100">
                <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <span className="text-lg">📶</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Скорость сети</p>
                    <p className="font-medium text-gray-900">
                      {selectedProd?.isUnlimited && selectedProd?.speed 
                        ? `3G/4G/5G (после лимита: ${selectedProd.speed})`
                        : '3G/4G/5G'
                      }
                    </p>
                  </div>
                </div>
                {selectedProd?.isUnlimited && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <span className="text-lg">📅</span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase">Тип тарифа</p>
                      <p className="font-medium text-gray-900">
                        {formatDataAmount(selectedProd.dataAmount)} в день на {selectedProd.validityDays} дней
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <span className="text-lg">🔄</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Пополнение</p>
                    <p className="font-medium text-gray-900">Можно продлить</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <span className="text-lg">📡</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Тип подключения</p>
                    <p className="font-medium text-gray-900">Только данные</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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
                <Link href={`/product/${selectedProduct}`}>
                  <button className="w-full py-4 rounded-2xl bg-[#f77430] hover:bg-[#f2622a] text-white font-semibold text-lg transition-colors shadow-lg shadow-orange-500/30">
                    Далее
                  </button>
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
