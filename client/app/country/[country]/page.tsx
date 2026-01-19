'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Share2 } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { productsApi, Product } from '@/lib/api'
import { formatPrice, formatDataAmount, getCountryEmoji } from '@/lib/utils'

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

  // Фильтрация по типу тарифа
  const isUnlimited = (product: Product) => {
    const name = (product.name + ' ' + (product.description || '')).toLowerCase()
    return name.includes('unlimited') || name.includes('безлимит') || name.includes('unlim')
  }

  const products = allProducts.filter(p => 
    activeTab === 'unlimited' ? isUnlimited(p) : !isUnlimited(p)
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getCountryEmoji(country)}</span>
            <span className="font-semibold text-lg">{country}</span>
          </div>
          <button 
            onClick={handleShare}
            className="p-2 -mr-2 text-gray-600 dark:text-gray-300"
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
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/20'
            }`}
          >
            Стандартные
          </button>
          <button
            onClick={() => setActiveTab('unlimited')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'unlimited'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/20'
            }`}
          >
            Безлимитные
          </button>
        </div>

        {/* Products List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl bg-white dark:bg-white/10 p-4">
                <div className="flex justify-between items-center">
                  <div className="skeleton h-5 w-24" />
                  <div className="skeleton h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur-xl text-center py-10">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">Тарифы не найдены</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-white/10 overflow-hidden">
            {products.map((product, index) => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product.id)}
                className={`
                  flex items-center justify-between px-4 py-4 cursor-pointer transition-all
                  ${index !== products.length - 1 ? 'border-b border-gray-100 dark:border-white/10' : ''}
                  ${selectedProduct === product.id 
                    ? 'bg-blue-50 dark:bg-blue-500/20 border-l-4 border-l-blue-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-white/5 border-l-4 border-l-transparent'
                  }
                `}
              >
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatDataAmount(product.dataAmount)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      на {product.validityDays} дн.
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 dark:text-white">
                    {formatPrice(product.ourPrice)} ₽
                  </span>
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                    ${selectedProduct === product.id 
                      ? 'border-blue-500 bg-blue-500' 
                      : 'border-gray-300 dark:border-gray-600'
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
        {products.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Особенности тарифа
            </h3>
            <div className="rounded-2xl bg-white dark:bg-white/10 divide-y divide-gray-100 dark:divide-white/10">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <span className="text-lg">📶</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Скорость сети</p>
                  <p className="font-medium text-gray-900 dark:text-white">3G/4G/5G</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                  <span className="text-lg">🔄</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Пополнение</p>
                  <p className="font-medium text-gray-900 dark:text-white">Можно продлить</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                  <span className="text-lg">📡</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Тип подключения</p>
                  <p className="font-medium text-gray-900 dark:text-white">Только данные</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Important Info */}
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Важно про eSIM
          </h3>
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Только мобильный интернет. Звонки и SMS не поддерживаются.
            </p>
          </div>
        </div>

        {/* Buy Button */}
        {selectedProduct && (
          <div className="mt-6 pb-24">
            <Link href={`/product/${selectedProduct}`}>
              <button className="w-full py-4 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg transition-colors shadow-lg shadow-blue-500/30">
                Купить eSIM
              </button>
            </Link>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
