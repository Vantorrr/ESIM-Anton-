'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Wifi, Clock, ChevronRight, Check } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { productsApi, Product } from '@/lib/api'
import { formatPrice, formatDataAmount, getCountryEmoji } from '@/lib/utils'

export default function CountryPage() {
  const params = useParams()
  const router = useRouter()
  const country = decodeURIComponent(params.country as string)
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [country])

  const loadProducts = async () => {
    try {
      const allProducts = await productsApi.getAll({ isActive: true })
      const countryProducts = allProducts.filter(p => p.country === country)
      // Сортируем по цене
      countryProducts.sort((a, b) => a.ourPrice - b.ourPrice)
      setProducts(countryProducts)
    } catch (error) {
      console.error('Ошибка загрузки:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container animate-fade-in">
      {/* Header */}
      <header className="mb-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-accent mb-4"
        >
          <ArrowLeft size={20} />
          <span>Назад</span>
        </button>
        
        <div className="flex items-center gap-4">
          <div className="text-6xl">{getCountryEmoji(country)}</div>
          <div>
            <h1 className="text-2xl font-bold text-primary">{country}</h1>
            <p className="text-secondary text-sm">{products.length} тарифов</p>
          </div>
        </div>
      </header>

      {/* Products */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card">
              <div className="skeleton h-6 w-32 mb-3" />
              <div className="skeleton h-4 w-full mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-secondary text-lg font-medium">Тарифы не найдены</p>
          <p className="text-muted text-sm mt-2">Попробуйте другую страну</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product, index) => (
            <Link key={product.id} href={`/product/${product.id}`}>
              <div 
                className="glass-card cursor-pointer animate-slide-up"
                style={{ animationDelay: `${0.05 * index}s` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-primary text-lg">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-secondary mt-1">{product.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-accent">₽{formatPrice(product.ourPrice)}</p>
                  </div>
                </div>
                
                {/* Features */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <Wifi size={16} className="text-accent" />
                    <span>{formatDataAmount(product.dataAmount)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <Clock size={16} className="text-accent" />
                    <span>{product.validityDays} дней</span>
                  </div>
                </div>

                {/* Benefits */}
                <div className="flex flex-wrap gap-2">
                  {['Мгновенная активация', 'QR-код', 'Поддержка 24/7'].map((benefit) => (
                    <div 
                      key={benefit}
                      className="flex items-center gap-1 text-xs text-muted bg-gray-50 rounded-full px-3 py-1"
                    >
                      <Check size={12} className="text-green-500" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Buy button hint */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="text-sm text-muted">Подробнее</span>
                  <ChevronRight size={20} className="text-muted" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
