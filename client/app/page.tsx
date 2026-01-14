'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Wifi, Clock, ChevronRight, Sparkles } from 'lucide-react'
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
      
      const uniqueCountries = Array.from(new Set(data.map(p => p.country)))
      setCountries(uniqueCountries.sort())
      
      setLoading(false)
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      setLoading(false)
    }
  }

  const filterProducts = () => {
    let filtered = products

    if (selectedCountry !== 'all') {
      filtered = filtered.filter(p => p.country === selectedCountry)
    }

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

  const getCountryEmoji = (country: string): string => {
    const countryLower = country.toLowerCase()
    const flags: Record<string, string> = {
      // Русские
      'сша': '🇺🇸', 'европа': '🇪🇺', 'турция': '🇹🇷', 'оаэ': '🇦🇪',
      'таиланд': '🇹🇭', 'япония': '🇯🇵', 'китай': '🇨🇳', 'корея': '🇰🇷',
      'сингапур': '🇸🇬', 'индонезия': '🇮🇩', 'россия': '🇷🇺', 'германия': '🇩🇪',
      'франция': '🇫🇷', 'италия': '🇮🇹', 'испания': '🇪🇸', 'великобритания': '🇬🇧',
      'канада': '🇨🇦', 'австралия': '🇦🇺', 'бразилия': '🇧🇷', 'мексика': '🇲🇽',
      'индия': '🇮🇳', 'вьетнам': '🇻🇳', 'малайзия': '🇲🇾', 'филиппины': '🇵🇭',
      'египет': '🇪🇬', 'израиль': '🇮🇱', 'греция': '🇬🇷', 'португалия': '🇵🇹',
      'нидерланды': '🇳🇱', 'бельгия': '🇧🇪', 'швейцария': '🇨🇭', 'австрия': '🇦🇹',
      'польша': '🇵🇱', 'чехия': '🇨🇿', 'швеция': '🇸🇪', 'норвегия': '🇳🇴',
      // English
      'united states': '🇺🇸', 'usa': '🇺🇸', 'europe': '🇪🇺', 'turkey': '🇹🇷',
      'united arab emirates': '🇦🇪', 'uae': '🇦🇪', 'thailand': '🇹🇭',
      'japan': '🇯🇵', 'china': '🇨🇳', 'south korea': '🇰🇷', 'korea': '🇰🇷',
      'singapore': '🇸🇬', 'indonesia': '🇮🇩', 'russia': '🇷🇺', 'germany': '🇩🇪',
      'france': '🇫🇷', 'italy': '🇮🇹', 'spain': '🇪🇸', 'united kingdom': '🇬🇧',
      'uk': '🇬🇧', 'canada': '🇨🇦', 'australia': '🇦🇺', 'brazil': '🇧🇷',
      'mexico': '🇲🇽', 'india': '🇮🇳', 'vietnam': '🇻🇳', 'malaysia': '🇲🇾',
      'philippines': '🇵🇭', 'egypt': '🇪🇬', 'israel': '🇮🇱', 'greece': '🇬🇷',
      'portugal': '🇵🇹', 'netherlands': '🇳🇱', 'belgium': '🇧🇪', 'switzerland': '🇨🇭',
      'austria': '🇦🇹', 'poland': '🇵🇱', 'czech republic': '🇨🇿', 'czechia': '🇨🇿',
      'sweden': '🇸🇪', 'norway': '🇳🇴', 'denmark': '🇩🇰', 'finland': '🇫🇮',
      'ireland': '🇮🇪', 'new zealand': '🇳🇿', 'hong kong': '🇭🇰', 'taiwan': '🇹🇼',
      'global': '🌍', 'worldwide': '🌍', 'asia': '🌏', 'americas': '🌎',
      // Коды стран ISO
      'us': '🇺🇸', 'tr': '🇹🇷', 'ae': '🇦🇪', 'th': '🇹🇭', 'jp': '🇯🇵',
      'cn': '🇨🇳', 'kr': '🇰🇷', 'sg': '🇸🇬', 'id': '🇮🇩', 'ru': '🇷🇺',
      'de': '🇩🇪', 'fr': '🇫🇷', 'it': '🇮🇹', 'es': '🇪🇸', 'gb': '🇬🇧',
      'ca': '🇨🇦', 'au': '🇦🇺', 'br': '🇧🇷', 'mx': '🇲🇽', 'in': '🇮🇳',
      'vn': '🇻🇳', 'my': '🇲🇾', 'ph': '🇵🇭', 'eg': '🇪🇬', 'il': '🇮🇱',
      'gr': '🇬🇷', 'pt': '🇵🇹', 'nl': '🇳🇱', 'be': '🇧🇪', 'ch': '🇨🇭',
      'at': '🇦🇹', 'pl': '🇵🇱', 'cz': '🇨🇿', 'se': '🇸🇪', 'no': '🇳🇴',
      'dk': '🇩🇰', 'fi': '🇫🇮', 'ie': '🇮🇪', 'nz': '🇳🇿', 'hk': '🇭🇰',
      'tw': '🇹🇼', 'sa': '🇸🇦', 'qa': '🇶🇦', 'kw': '🇰🇼', 'bh': '🇧🇭',
    }
    return flags[countryLower] || '🌍'
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">eSIM</h1>
            <p className="text-secondary text-sm">Интернет по всему миру</p>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="mb-6 animate-slide-up">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
          <input
            type="text"
            className="glass-input pl-12"
            placeholder="Поиск страны..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Country Filter */}
      <div className="mb-6 -mx-5 px-5 overflow-x-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex gap-2 pb-2">
          <button
            onClick={() => setSelectedCountry('all')}
            className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCountry === 'all'
                ? 'glass-button'
                : 'glass-button-secondary'
            }`}
            style={{ width: 'auto' }}
          >
            Все
          </button>
          {countries.map((country) => (
            <button
              key={country}
              onClick={() => setSelectedCountry(country)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                selectedCountry === country
                  ? 'glass-button'
                  : 'glass-button-secondary'
              }`}
              style={{ width: 'auto' }}
            >
              <span>{getCountryEmoji(country)}</span>
              <span>{country}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats Banner */}
      <div className="glass-card mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <div className="flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-accent">100+</p>
            <p className="text-xs text-muted">Стран</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div>
            <p className="text-2xl font-bold text-accent">5 мин</p>
            <p className="text-xs text-muted">Активация</p>
          </div>
          <div className="w-px bg-gray-200" />
          <div>
            <p className="text-2xl font-bold text-accent">24/7</p>
            <p className="text-xs text-muted">Поддержка</p>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="mb-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-lg font-semibold mb-4">
          {selectedCountry === 'all' ? 'Все тарифы' : selectedCountry}
        </h2>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card">
              <div className="flex gap-4">
                <div className="skeleton w-14 h-14 rounded-xl" />
                <div className="flex-1">
                  <div className="skeleton h-5 w-24 mb-2" />
                  <div className="skeleton h-4 w-full mb-2" />
                  <div className="skeleton h-4 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass-card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Search className="text-muted" size={32} />
          </div>
          <p className="text-secondary text-lg font-medium">Ничего не найдено</p>
          <p className="text-muted text-sm mt-2">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product, index) => (
            <Link key={product.id} href={`/product/${product.id}`}>
              <div 
                className="glass-card flex items-center gap-4 animate-slide-up cursor-pointer"
                style={{ animationDelay: `${0.05 * (index + 1)}s` }}
              >
                {/* Country Flag */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-3xl shrink-0">
                  {getCountryEmoji(product.country)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-primary truncate">{product.country}</h3>
                      <p className="text-sm text-secondary">{product.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="price-tag">₽{product.ourPrice}</p>
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Wifi size={14} />
                      <span>{product.dataAmount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Clock size={14} />
                      <span>{product.validityDays} дн.</span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="text-muted shrink-0" size={20} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  )
}
