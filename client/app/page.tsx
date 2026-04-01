'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { productsApi, Product } from '@/lib/api'
import { formatPrice, getFlagUrl, getCountryName } from '@/lib/utils'
import {
  getCoverageCount,
  getCoveragePreview,
  getCoverageScopeLabel,
  getCoverageSummary,
  isGlobalProduct,
  isMultiProduct,
} from '@/lib/productCoverage'

// Brand splash screen — plays the original MOJO animation video
function SplashScreen({ onFinished }: { onFinished: () => void }) {
  const [fading, setFading] = useState(false)

  const handleVideoEnd = () => {
    setFading(true)
    setTimeout(onFinished, 600)
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-[#e96a25]"
      style={{
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.6s ease-out',
      }}
    >
      <video
        src="/MOJO anim_2.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleVideoEnd}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  )
}

// Типы для группировки стран
interface CountryGroup {
  country: string
  minPrice: number
  productCount: number
  coverageCount: number
  coverageSummary: string
  coveragePreview: string
  scopeLabel: string
  isMulti?: boolean
  isGlobal?: boolean
}

// Популярные страны (можно настроить)
const POPULAR_COUNTRIES = [
  'Turkey', 'Турция',
  'Russia', 'Россия', 
  'Egypt', 'Египет',
  'United Arab Emirates', 'ОАЭ', 'UAE',
  'China', 'Китай',
  'Georgia', 'Грузия',
  'Thailand', 'Таиланд',
  'Japan', 'Япония',
  'Germany', 'Германия',
  'France', 'Франция',
  'Italy', 'Италия',
  'Spain', 'Испания',
  'USA', 'United States', 'США',
  'UK', 'United Kingdom', 'Великобритания',
]

// Liquid Glass карточка страны (iOS style)
function CountryCard({ group, index }: { group: CountryGroup; index: number }) {
  const flagUrl = getFlagUrl(group.country)
  const countryName = getCountryName(group.country)
  
  return (
    <Link href={`/country/${encodeURIComponent(group.country)}`}>
      <div
        className="
          relative overflow-hidden cursor-pointer
          py-4 px-3
          card-neutral
          transition-all duration-200
          active:scale-[0.98]
          animate-slide-up
        "
        style={{ animationDelay: `${0.03 * index}s` }}
      >
        <div className="text-center">
          <div className="w-14 h-10 mx-auto mb-2.5 flex items-center justify-center">
            {flagUrl ? (
              <img
                src={flagUrl}
                alt={countryName}
                className="w-14 h-auto rounded-md shadow-sm object-cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = '/logo-mark.png'; (e.target as HTMLImageElement).className = 'w-10 h-10 rounded-lg object-contain'; }}
              />
            ) : (
              <img src="/logo-mark.png" alt="Mojo mobile" className="w-10 h-10 rounded-lg object-contain" />
            )}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#f77430] mb-1">
            {group.scopeLabel}
          </p>
          <p className="font-semibold text-base leading-tight text-gray-900 mb-1 truncate">
            {countryName}
          </p>
          <p className="text-[11px] text-gray-500 min-h-[28px] leading-4 mb-1">
            {group.coverageCount > 1 ? `${group.coverageSummary}` : 'Одна страна'}
            {group.coveragePreview ? ` • ${group.coveragePreview}` : ''}
          </p>
          <p className="text-[11px] text-gray-400 mb-1">
            {group.productCount} {group.productCount === 1 ? 'тариф' : group.productCount < 5 ? 'тарифа' : 'тарифов'}
          </p>
          <p className="text-xs font-semibold text-[#f7741d]/85">
            от ₽{formatPrice(group.minPrice)}
          </p>
        </div>
      </div>
    </Link>
  )
}

// Кэш для данных (чтобы не загружать заново при возврате)
const CACHE_KEY = 'esim_products_cache'
const SEARCH_KEY = 'esim_search_query'

function getCachedProducts(): Product[] | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      // Кэш валиден 5 минут
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data
      }
    }
  } catch {
    // Ignore sessionStorage errors
  }
  return null
}

function setCachedProducts(data: Product[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // Ignore sessionStorage errors
  }
}

function getSavedSearch(): string {
  if (typeof window === 'undefined') return ''
  try {
    return sessionStorage.getItem(SEARCH_KEY) || ''
  } catch {
    // Ignore sessionStorage errors
  }
  return ''
}

function saveSearch(query: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SEARCH_KEY, query)
  } catch {
    // Ignore sessionStorage errors
  }
}

export default function Home() {
  const cachedData = getCachedProducts()
  const hasCachedData = cachedData && cachedData.length > 0
  
  const [products, setProducts] = useState<Product[]>(cachedData || [])
  const [loading, setLoading] = useState(!hasCachedData)
  const [showSplash, setShowSplash] = useState(!hasCachedData)
  const [searchQuery, setSearchQuery] = useState(getSavedSearch())
  const [activeTab, setActiveTab] = useState<'countries' | 'multi' | 'global'>('countries')
  const [countryGroups, setCountryGroups] = useState<CountryGroup[]>([])
  const [multiGroups, setMultiGroups] = useState<CountryGroup[]>([])
  const [globalGroups, setGlobalGroups] = useState<CountryGroup[]>([])
  const [popularCountries, setPopularCountries] = useState<CountryGroup[]>([])

  const dataReadyRef = React.useRef(hasCachedData)
  const videoEndedRef = React.useRef(false)

  const tryDismissSplash = () => {
    if (dataReadyRef.current && videoEndedRef.current) {
      setShowSplash(false)
      setLoading(false)
    }
  }

  const handleSplashFinished = () => {
    videoEndedRef.current = true
    tryDismissSplash()
  }

  useEffect(() => {
    if (!hasCachedData) {
      loadProducts()
    }
  }, [])

  useEffect(() => {
    groupByCountry()
  }, [products])

  useEffect(() => {
    saveSearch(searchQuery)
  }, [searchQuery])

  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll({ isActive: true })
      setProducts(data)
      setCachedProducts(data)
      dataReadyRef.current = true
      tryDismissSplash()
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      dataReadyRef.current = true
      tryDismissSplash()
    }
  }

  const groupByCountry = () => {
    const groups: Record<string, CountryGroup> = {}
    const multi: Record<string, CountryGroup> = {}
    const global: Record<string, CountryGroup> = {}
    
    products.forEach(product => {
      const country = product.country
      const isGlobal = isGlobalProduct(product)
      const isMulti = isMultiProduct(product)
      
      const targetGroups = isGlobal ? global : isMulti ? multi : groups
      
      if (!targetGroups[country]) {
        targetGroups[country] = {
          country,
          minPrice: product.ourPrice,
          productCount: 1,
          coverageCount: getCoverageCount(product),
          coverageSummary: getCoverageSummary(product),
          coveragePreview: getCoveragePreview(product, 2),
          scopeLabel: getCoverageScopeLabel(product),
          isMulti: Boolean(isMulti),
          isGlobal: Boolean(isGlobal)
        }
      } else {
        targetGroups[country].minPrice = Math.min(targetGroups[country].minPrice, product.ourPrice)
        targetGroups[country].productCount++
      }
    })
    
    const allGroups = Object.values(groups).sort((a, b) => a.country.localeCompare(b.country))
    const allMulti = Object.values(multi).sort((a, b) => a.country.localeCompare(b.country))
    const allGlobal = Object.values(global).sort((a, b) => a.minPrice - b.minPrice)
    
    setCountryGroups(allGroups)
    setMultiGroups(allMulti)
    setGlobalGroups(allGlobal)
    
    // Выделяем популярные
    const popular = allGroups.filter(g => 
      POPULAR_COUNTRIES.some(pc => 
        g.country.toLowerCase().includes(pc.toLowerCase()) ||
        pc.toLowerCase().includes(g.country.toLowerCase())
      )
    ).slice(0, 8)
    
    setPopularCountries(popular.length > 0 ? popular : allGroups.slice(0, 8))
  }

  // Поиск по названию страны (на русском) И по ISO коду
  const filteredCountries = searchQuery
    ? countryGroups.filter(g => {
        const query = searchQuery.toLowerCase();
        const countryName = getCountryName(g.country).toLowerCase();
        const countryCode = g.country.toLowerCase();
        return countryName.includes(query) || countryCode.includes(query);
      })
    : countryGroups

  // Автоскролл к результатам при поиске
  useEffect(() => {
    if (searchQuery) {
      // Небольшая задержка для отрисовки
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    }
  }, [searchQuery])

  if (showSplash) {
    return <SplashScreen onFinished={handleSplashFinished} />
  }

  return (
    <div className="container animate-fade-in bg-[#f4f5f7]">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#f2622a] to-[#f9d17f] flex items-center justify-center shadow-lg p-1.5">
            <img src="/logo-mark.png" alt="Mojo mobile" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Mojo mobile</h1>
            <p className="text-secondary text-sm">Интернет по всему миру</p>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="mb-4 animate-slide-up">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            className="w-full py-3 pl-11 pr-10 soft-input text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f77430]/25"
            placeholder="Поиск страны..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            enterKeyHint="search"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-300 dark:bg-white/20 flex items-center justify-center text-xs text-gray-600 dark:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="w-full rounded-full bg-white/75 border border-gray-200 p-1 flex gap-1.5">
        {[
          { id: 'countries' as const, label: 'Страны' },
          { id: 'multi' as const, label: 'Мульти-страны' },
          { id: 'global' as const, label: 'Глобальный' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 rounded-full text-sm font-medium text-center transition-all ${
              activeTab === tab.id
                ? 'bg-[#f77430] text-white shadow-md shadow-orange-200'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card-neutral p-4">
              <div className="skeleton w-10 h-10 rounded-xl mx-auto mb-2" />
              <div className="skeleton h-3 w-16 mx-auto mb-1" />
              <div className="skeleton h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      ) : searchQuery ? (
        // Результаты поиска - список
        <>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Страны
          </h2>
          {filteredCountries.length === 0 ? (
            <div className="card-neutral text-center py-10">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-600 font-medium">Ничего не найдено</p>
              <p className="text-gray-400 text-sm mt-1">Попробуйте другой запрос</p>
            </div>
          ) : (
            <div className="card-neutral overflow-hidden">
              {filteredCountries.map((group, index) => {
                const flagUrl = getFlagUrl(group.country);
                const countryName = getCountryName(group.country);
                return (
                  <Link key={group.country} href={`/country/${encodeURIComponent(group.country)}`}>
                    <div 
                      className={`flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-black/5 active:bg-black/10 transition-colors ${
                        index !== filteredCountries.length - 1 ? 'border-b border-gray-200/60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {flagUrl ? (
                          <img src={flagUrl} alt={countryName} className="w-8 h-auto rounded shadow-sm" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).src = '/logo-mark.png'; (e.target as HTMLImageElement).className = 'w-8 h-8 rounded-lg object-contain'; }} />
                        ) : (
                          <img src="/logo-mark.png" alt="Mojo mobile" className="w-8 h-8 rounded-lg object-contain" />
                        )}
                        <span className="font-medium text-gray-900">{countryName}</span>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : activeTab === 'multi' ? (
        // Мульти-страны
        <>
          <div className="card-neutral p-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Региональные пакеты
            </p>
            <p className="text-sm text-gray-600">
              Один eSIM работает сразу в нескольких странах региона. На карточке видно, сколько стран входит в пакет.
            </p>
          </div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Региональные пакеты
          </h2>
          {multiGroups.length === 0 ? (
            <div className="card-neutral text-center py-10">
              <img src="/logo-mark.png" alt="Mojo mobile" className="w-12 h-12 mx-auto mb-3 rounded-xl object-contain" />
              <p className="text-gray-600 font-medium">Скоро появятся</p>
              <p className="text-gray-400 text-sm mt-1">Мульти-страны в разработке</p>
            </div>
          ) : (
            <div className="rounded-[22px] bg-gradient-to-b from-[#f7b35f] to-[#f7741d] p-2.5 shadow-[0_10px_24px_rgba(247,116,29,0.32)]">
              <div className="grid grid-cols-2 gap-3">
                {multiGroups.map((group, index) => (
                  <CountryCard key={group.country} group={group} index={index} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'global' ? (
        // Глобальный
        <>
          <div className="card-neutral p-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Глобальные пакеты
            </p>
            <p className="text-sm text-gray-600">
              Пакеты для мира и больших географий. Сразу видно охват по странам, чтобы не гадать, что входит внутрь.
            </p>
          </div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Глобальные пакеты
          </h2>
          {globalGroups.length === 0 ? (
            <div className="card-neutral text-center py-10">
              <img src="/logo-mark.png" alt="Mojo mobile" className="w-12 h-12 mx-auto mb-3 rounded-xl object-contain" />
              <p className="text-gray-600 font-medium">Скоро появятся</p>
              <p className="text-gray-400 text-sm mt-1">Глобальные тарифы в разработке</p>
            </div>
          ) : (
            <div className="rounded-[22px] bg-gradient-to-b from-[#f7b35f] to-[#f7741d] p-2.5 shadow-[0_10px_24px_rgba(247,116,29,0.32)]">
              <div className="grid grid-cols-2 gap-3">
                {globalGroups.map((group, index) => (
                  <CountryCard key={group.country} group={group} index={index} />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        // Главный экран - Страны
        <>
          {/* Популярные направления */}
          <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Популярные направления
            </h2>
            <div className="rounded-[22px] bg-gradient-to-b from-[#f7b35f] to-[#f7741d] p-2.5 shadow-[0_10px_24px_rgba(247,116,29,0.32)]">
              <div className="grid grid-cols-2 gap-3">
                {popularCountries.map((group, index) => (
                  <CountryCard key={group.country} group={group} index={index} />
                ))}
              </div>
            </div>
          </div>

          {/* Все страны */}
          <div className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Все страны
            </h2>
            <div className="rounded-[22px] bg-gradient-to-b from-[#f7b35f] to-[#f7741d] p-2.5 shadow-[0_10px_24px_rgba(247,116,29,0.32)]">
              <div className="grid grid-cols-2 gap-3">
                {countryGroups.map((group, index) => (
                  <CountryCard key={group.country} group={group} index={index} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
