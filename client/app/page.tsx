'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, MapPin, Zap, Shield, Award } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { productsApi, Product } from '@/lib/api'

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [countries, setCountries] = useState<string[]>([])

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    filterProducts()
  }, [searchQuery, selectedCountry, products])

  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll({ isActive: true })
      setProducts(data)
      
      // Извлекаем уникальные страны
      const uniqueCountries = Array.from(new Set(data.map(p => p.country)))
      setCountries(uniqueCountries.sort())
      
      setLoading(false)
    } catch (error) {
      console.error('Ошибка загрузки продуктов:', error)
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = products

    // Фильтр по стране
    if (selectedCountry !== 'all') {
      filtered = filtered.filter(p => p.country === selectedCountry)
    }

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.country.toLowerCase().includes(query) ||
        p.region?.toLowerCase().includes(query)
      )
    }

    setFilteredProducts(filtered)
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold mb-2">🌍 eSIM Service</h1>
        <p className="tg-hint">Мобильный интернет по всему миру</p>
      </header>

      {/* Features */}
      <div className="grid grid-cols-3 gap-3 mb-6 animate-slide-up">
        <div className="tg-card text-center py-4">
          <Zap className="mx-auto mb-2" size={24} style={{ color: 'var(--tg-theme-button-color)' }} />
          <p className="text-xs font-medium">Моментальная активация</p>
        </div>
        <div className="tg-card text-center py-4">
          <Shield className="mx-auto mb-2" size={24} style={{ color: 'var(--tg-theme-button-color)' }} />
          <p className="text-xs font-medium">Надёжная связь</p>
        </div>
        <div className="tg-card text-center py-4">
          <Award className="mx-auto mb-2" size={24} style={{ color: 'var(--tg-theme-button-color)' }} />
          <p className="text-xs font-medium">Выгодные цены</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 tg-hint" size={20} />
          <input
            type="text"
            className="tg-input pl-12"
            placeholder="Поиск по стране или региону..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Country Filter */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          <button
            onClick={() => setSelectedCountry('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCountry === 'all'
                ? 'tg-button'
                : 'tg-button-outline'
            }`}
            style={{
              background: selectedCountry === 'all' ? 'var(--tg-theme-button-color)' : 'transparent',
              color: selectedCountry === 'all' ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-button-color)',
            }}
          >
            Все страны
          </button>
          {countries.map((country) => (
            <button
              key={country}
              onClick={() => setSelectedCountry(country)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCountry === country
                  ? 'tg-button'
                  : 'tg-button-outline'
              }`}
              style={{
                background: selectedCountry === country ? 'var(--tg-theme-button-color)' : 'transparent',
                color: selectedCountry === country ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-button-color)',
              }}
            >
              {country}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="tg-card">
              <div className="skeleton h-6 w-32 mb-2" />
              <div className="skeleton h-4 w-full mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="tg-card text-center py-12">
          <MapPin className="mx-auto mb-4 tg-hint" size={48} />
          <p className="tg-hint text-lg">Продукты не найдены</p>
          <p className="tg-hint text-sm mt-2">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="space-y-3 animate-slide-up">
          {filteredProducts.map((product) => (
            <Link key={product.id} href={`/product/${product.id}`}>
              <div className="tg-card hover:opacity-90 transition-opacity cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{product.country}</h3>
                    <p className="text-sm">{product.name}</p>
                    {product.region && (
                      <p className="tg-hint text-xs mt-1">{product.region}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl" style={{ color: 'var(--tg-theme-button-color)' }}>
                      ₽{product.ourPrice}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1 tg-hint">
                    <Zap size={16} />
                    <span>{product.dataAmount}</span>
                  </div>
                  <div className="flex items-center gap-1 tg-hint">
                    <span>📅 {product.validityDays} дней</span>
                  </div>
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
