'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, Search } from 'lucide-react'
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

function CountryListRow({ group, index }: { group: CountryGroup; index: number }) {
  const flagUrl = getFlagUrl(group.country)
  const countryName = getCountryName(group.country)
  
  return (
    <Link href={`/country/${encodeURIComponent(group.country)}`}>
      <div
        className="card-neutral flex items-center gap-3 px-4 py-4 transition-all active:scale-[0.99] animate-slide-up"
        style={{ animationDelay: `${0.03 * index}s` }}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-50">
          {flagUrl ? (
            <img
              src={flagUrl}
              alt={countryName}
              className="h-9 w-9 rounded-full object-cover"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).src = '/logo-mark.png'; (e.target as HTMLImageElement).className = 'h-9 w-9 rounded-full object-contain'; }}
            />
          ) : (
            <img src="/logo-mark.png" alt="Mojo mobile" className="h-9 w-9 rounded-full object-contain" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">{countryName}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {group.productCount} {group.productCount === 1 ? 'тариф' : group.productCount < 5 ? 'тарифа' : 'тарифов'}
            {' • '}от ₽{formatPrice(group.minPrice)}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
      </div>
    </Link>
  )
}

function ListSection({
  title,
  items,
  renderItem,
}: {
  title: string
  items: CountryGroup[]
  renderItem: (group: CountryGroup, index: number) => React.ReactNode
}) {
  return (
    <>
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="space-y-3">
        {items.map((group, index) => renderItem(group, index))}
      </div>
    </>
  )
}

function RegionBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
      {label}
    </span>
  )
}

function GlobalListRow({ group, index }: { group: CountryGroup; index: number }) {
  const { emoji, bg, text } = getRegionVisual(group.country)
  const regionName = getCountryName(group.country)

  return (
    <Link href={`/country/${encodeURIComponent(group.country)}`}>
      <div
        className="card-neutral flex items-center gap-3 px-4 py-4 transition-all active:scale-[0.99] animate-slide-up"
        style={{ animationDelay: `${0.03 * index}s` }}
      >
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${bg}`}>
          <span className="text-lg">{emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <p className="truncate font-medium text-gray-900">{regionName}</p>
            <RegionBadge label={group.scopeLabel} />
          </div>
          <p className="text-xs text-gray-500">
            {group.coverageSummary}
            {group.coveragePreview ? ` • ${group.coveragePreview}` : ''}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {group.productCount} {group.productCount === 1 ? 'тариф' : group.productCount < 5 ? 'тарифа' : 'тарифов'} • от ₽{formatPrice(group.minPrice)}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
      </div>
    </Link>
  )
}

function getRegionVisual(country: string) {
  const normalized = getCountryName(country).toLowerCase()

  if (normalized.includes('европ')) return { emoji: '🌍', bg: 'bg-emerald-100', text: 'text-emerald-700' }
  if (normalized.includes('ази')) return { emoji: '🌏', bg: 'bg-rose-100', text: 'text-rose-700' }
  if (normalized.includes('америк')) return { emoji: '🌎', bg: 'bg-sky-100', text: 'text-sky-700' }
  if (normalized.includes('африк')) return { emoji: '🌍', bg: 'bg-amber-100', text: 'text-amber-700' }
  if (normalized.includes('океан')) return { emoji: '🌊', bg: 'bg-cyan-100', text: 'text-cyan-700' }
  if (normalized.includes('восток')) return { emoji: '☀️', bg: 'bg-orange-100', text: 'text-orange-700' }
  if (normalized.includes('глоб') || normalized.includes('мир')) return { emoji: '🛰️', bg: 'bg-violet-100', text: 'text-violet-700' }

  return { emoji: '🌐', bg: 'bg-gray-100', text: 'text-gray-700' }
}

function RegionListCard({ group, index }: { group: CountryGroup; index: number }) {
  const { emoji, bg, text } = getRegionVisual(group.country)
  const regionName = getCountryName(group.country)

  return (
    <Link href={`/country/${encodeURIComponent(group.country)}`}>
      <div
        className="card-neutral flex items-center gap-3 px-4 py-4 transition-all active:scale-[0.99] animate-slide-up"
        style={{ animationDelay: `${0.03 * index}s` }}
      >
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${bg}`}>
          <span className="text-xl">{emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <p className="truncate font-medium text-gray-900">{regionName}</p>
            <RegionBadge label={group.scopeLabel} />
          </div>
          <p className="text-xs text-gray-500">
            {group.coverageSummary}
            {group.coveragePreview ? ` • ${group.coveragePreview}` : ''}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-400">
            {group.productCount} {group.productCount === 1 ? 'тариф' : group.productCount < 5 ? 'тарифа' : 'тарифов'} • от ₽{formatPrice(group.minPrice)}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
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
          { id: 'multi' as const, label: 'Регионы' },
          { id: 'global' as const, label: 'Глобальные' },
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
            <div className="space-y-3">
              {filteredCountries.map((group, index) => (
                <CountryListRow key={group.country} group={group} index={index} />
              ))}
            </div>
          )}
        </>
      ) : activeTab === 'multi' ? (
        // Мульти-страны
        <>
          <div className="card-neutral p-4 mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Каталог регионов
            </p>
            <p className="text-sm text-gray-600">
              Как в Ton Mobile: сначала выбираете нужный регион, а уже внутри видите тарифы и полный список стран, которые входят в пакет.
            </p>
          </div>
          {multiGroups.length === 0 ? (
            <div className="card-neutral text-center py-10">
              <img src="/logo-mark.png" alt="Mojo mobile" className="w-12 h-12 mx-auto mb-3 rounded-xl object-contain" />
              <p className="text-gray-600 font-medium">Скоро появятся</p>
              <p className="text-gray-400 text-sm mt-1">Мульти-страны в разработке</p>
            </div>
          ) : (
            <ListSection
              title="Регионы"
              items={multiGroups}
              renderItem={(group, index) => <RegionListCard key={group.country} group={group} index={index} />}
            />
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
              Пакеты для мира и больших географий. Сразу видно охват по странам, а внутри страницы пакета можно посмотреть подробный список покрытия.
            </p>
          </div>
          {globalGroups.length === 0 ? (
            <div className="card-neutral text-center py-10">
              <img src="/logo-mark.png" alt="Mojo mobile" className="w-12 h-12 mx-auto mb-3 rounded-xl object-contain" />
              <p className="text-gray-600 font-medium">Скоро появятся</p>
              <p className="text-gray-400 text-sm mt-1">Глобальные тарифы в разработке</p>
            </div>
          ) : (
            <ListSection
              title="Глобальные"
              items={globalGroups}
              renderItem={(group, index) => <GlobalListRow key={group.country} group={group} index={index} />}
            />
          )}
        </>
      ) : (
        // Главный экран - Страны
        <>
          {/* Популярные направления */}
          <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <ListSection
              title="Популярные страны"
              items={popularCountries}
              renderItem={(group, index) => <CountryListRow key={group.country} group={group} index={index} />}
            />
          </div>

          {/* Все страны */}
          <div className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <ListSection
              title="Все страны"
              items={countryGroups}
              renderItem={(group, index) => <CountryListRow key={group.country} group={group} index={index} />}
            />
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
