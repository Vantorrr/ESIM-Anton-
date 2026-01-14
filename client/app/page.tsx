'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Wifi, Clock, ChevronRight, Sparkles, Globe, Signal } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { productsApi, Product } from '@/lib/api'

// Liquid Glass Splash Screen
function SplashScreen({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Glass container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
            <Globe className="w-14 h-14 text-white animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 w-28 h-28 rounded-3xl bg-blue-500/50 blur-2xl -z-10 animate-pulse" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
          eSIM
        </h1>
        <p className="text-white/60 text-lg mb-10">
          Интернет по всему миру
        </p>

        {/* Progress bar */}
        <div className="w-64 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Loading text */}
        <div className="mt-4 flex items-center gap-2 text-white/50 text-sm">
          <Signal className="w-4 h-4 animate-pulse" />
          <span>Загрузка тарифов...</span>
        </div>

        {/* Features preview */}
        <div className="mt-12 flex gap-6">
          {['100+ стран', 'Мгновенно', '24/7'].map((text, i) => (
            <div 
              key={text}
              className="px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-white/70 text-xs"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
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
      // Анимация прогресса
      setLoadProgress(10)
      await new Promise(r => setTimeout(r, 200))
      setLoadProgress(30)
      
      const data = await productsApi.getAll({ isActive: true })
      setLoadProgress(70)
      
      setProducts(data)
      const uniqueCountries = Array.from(new Set(data.map(p => p.country)))
      setCountries(uniqueCountries.sort())
      
      setLoadProgress(100)
      
      // Плавное скрытие splash screen
      await new Promise(r => setTimeout(r, 500))
      setShowSplash(false)
      setLoading(false)
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      setLoadProgress(100)
      await new Promise(r => setTimeout(r, 300))
      setShowSplash(false)
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

  // Конвертирует ISO код страны (2 буквы) в эмодзи флага
  const isoToFlag = (isoCode: string): string => {
    if (isoCode.length !== 2) return '🌍'
    const code = isoCode.toUpperCase()
    const offset = 127397 // Разница между ASCII и Regional Indicator
    return String.fromCodePoint(
      code.charCodeAt(0) + offset,
      code.charCodeAt(1) + offset
    )
  }

  const getCountryEmoji = (country: string): string => {
    // Если это ISO код (2 буквы) - конвертируем в флаг
    if (/^[A-Za-z]{2}$/.test(country)) {
      return isoToFlag(country)
    }
    
    // Если это комбинация кодов (US,CA,MX) - показываем глобус
    if (country.includes(',')) {
      return '🌍'
    }

    const countryLower = country.toLowerCase()
    const flags: Record<string, string> = {
      'сша': '🇺🇸', 'европа': '🇪🇺', 'турция': '🇹🇷', 'оаэ': '🇦🇪',
      'таиланд': '🇹🇭', 'япония': '🇯🇵', 'китай': '🇨🇳', 'корея': '🇰🇷',
      'сингапур': '🇸🇬', 'индонезия': '🇮🇩', 'россия': '🇷🇺', 'германия': '🇩🇪',
      'франция': '🇫🇷', 'италия': '🇮🇹', 'испания': '🇪🇸', 'великобритания': '🇬🇧',
      'united states': '🇺🇸', 'usa': '🇺🇸', 'europe': '🇪🇺', 'turkey': '🇹🇷',
      'united arab emirates': '🇦🇪', 'thailand': '🇹🇭', 'japan': '🇯🇵',
      'china': '🇨🇳', 'south korea': '🇰🇷', 'singapore': '🇸🇬',
      'global': '🌍', 'worldwide': '🌍', 'asia': '🌏', 'americas': '🌎',
    }
    return flags[countryLower] || '🌍'
  }

  // Показываем splash screen
  if (showSplash) {
    return <SplashScreen progress={loadProgress} />
  }

  return (
    <div className="container animate-fade-in">
      {/* Header */}
      <header className="mb-8">
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
