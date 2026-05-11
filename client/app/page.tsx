'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search } from '@/components/icons'
import BottomNav from '@/components/BottomNav'
import { productsApi, Product } from '@/lib/api'
import { getFlagUrl, getCountryName } from '@/lib/utils'
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

// Twemoji глобусы (скачаны локально в /public/emoji/)
const GLOBE_EU_AF = '/emoji/globe-eu-af.svg'  // 🌍 Европа + Африка
const GLOBE_ASIA = '/emoji/globe-asia.svg'   // 🌏 Азия + Австралия
const GLOBE_AM = '/emoji/globe-am.svg'     // 🌎 Америка
const GLOBE_GRID = '/emoji/globe-grid.svg'   // 🌐 глобус с сеткой

function getRegionIcon(humanName: string): { img: string; bg: string } {
  const n = humanName.trim().toLowerCase()

  if (n.includes('европ') || n.includes('балкан'))
    return { img: GLOBE_EU_AF, bg: 'bg-blue-100' }
  if (n.includes('юго-восточ') || n.includes('сингапур') || n.includes('малайзи'))
    return { img: GLOBE_ASIA, bg: 'bg-teal-100' }
  if (n.includes('централ') && n.includes('ази'))
    return { img: GLOBE_ASIA, bg: 'bg-amber-100' }
  if (n.includes('ази'))
    return { img: GLOBE_ASIA, bg: 'bg-rose-100' }
  if (n.includes('северная америка') || (n.includes('сша') && n.includes('канад')))
    return { img: GLOBE_AM, bg: 'bg-sky-100' }
  if (n.includes('южная америка') || n.includes('карибы') || n.includes('латин'))
    return { img: GLOBE_AM, bg: 'bg-violet-100' }
  if (n.includes('ближн') || n.includes('персидск') || n.includes('залив') || n.includes('аравийск'))
    return { img: GLOBE_EU_AF, bg: 'bg-amber-100' }
  if (n.includes('африк'))
    return { img: GLOBE_EU_AF, bg: 'bg-yellow-100' }
  if (n.includes('океан') || n.includes('австрал') || n.includes('зеланд'))
    return { img: GLOBE_ASIA, bg: 'bg-emerald-100' }
  if (n.includes('британ') || n.includes('ирланд'))
    return { img: '/flags/gb.png', bg: 'bg-indigo-50' }
  if (n.includes('китай') || n.includes('япон') || n.includes('корея'))
    return { img: GLOBE_ASIA, bg: 'bg-red-100' }
  if (n.includes('глобальн'))
    return { img: GLOBE_GRID, bg: 'bg-blue-100' }

  return { img: GLOBE_GRID, bg: 'bg-gray-100' }
}

function CountryListRow({ group, index }: { group: CountryGroup; index: number }) {
  const flagUrl = getFlagUrl(group.country)
  const countryName = getCountryName(group.country)

  return (
    <Link href={`/country/${encodeURIComponent(group.country)}`}>
      <div
        className="card-neutral flex items-center justify-between px-4 py-3.5 transition-all active:scale-[0.99] animate-slide-up"
        style={{ animationDelay: `${0.03 * index}s` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-50">
            {flagUrl ? (
              <img
                src={flagUrl}
                alt={countryName}
                className="w-10 h-7 rounded-sm object-cover"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = '/logo-mark.png'; (e.target as HTMLImageElement).className = 'w-8 h-8 rounded-lg object-contain'; }}
              />
            ) : (
              <img src="/logo-mark.png" alt="Mojo mobile" className="w-8 h-8 rounded-lg object-contain" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{countryName}</p>
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

function RegionListRow({ group, index }: { group: CountryGroup; index: number }) {
  const title = getCountryName(group.country)
  const icon = getRegionIcon(title)

  return (
    <Link href={`/country/${encodeURIComponent(group.country)}`}>
      <div
        className="card-neutral flex items-center justify-between px-4 py-3.5 transition-all active:scale-[0.99] animate-slide-up"
        style={{ animationDelay: `${0.03 * index}s` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${icon.bg}`}>
            <img src={icon.img} alt={title} className="w-7 h-7" loading="lazy" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {group.coverageCount > 1 ? `${group.coverageSummary}` : 'Региональный пакет'}
            </p>
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

function GlobalListRow({ group, index }: { group: CountryGroup; index: number }) {
  const title = getCountryName(group.country)
  return (
    <Link href={`/country/${encodeURIComponent(group.country)}`}>
      <div
        className="card-neutral flex items-center justify-between px-4 py-3.5 transition-all active:scale-[0.99] animate-slide-up"
        style={{ animationDelay: `${0.03 * index}s` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <img src={GLOBE_GRID} alt="Глобальный" className="w-7 h-7" loading="lazy" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 dark:text-white truncate">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {group.coverageSummary}
            </p>
          </div>
        </div>
        <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
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
  renderItem: (group: CountryGroup, index: number) => JSX.Element
}) {
  return (
    <>
      <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="flex flex-col gap-3">
        {items.map((group, index) => renderItem(group, index))}
      </div>
    </>
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
  // SSR-safe defaults: на сервере всегда splash + пустые данные.
  // sessionStorage читаем только на клиенте в useEffect, чтобы
  // избежать hydration mismatch (сервер не имеет доступа к sessionStorage).
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'countries' | 'multi' | 'global'>('countries')
  const [countryGroups, setCountryGroups] = useState<CountryGroup[]>([])
  const [multiGroups, setMultiGroups] = useState<CountryGroup[]>([])
  const [globalGroups, setGlobalGroups] = useState<CountryGroup[]>([])
  const [popularCountries, setPopularCountries] = useState<CountryGroup[]>([])

  const dataReadyRef = useRef(false)
  const videoEndedRef = useRef(false)

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

  const loadProducts = useCallback(async () => {
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
  }, [])

  const groupByCountry = useCallback(() => {
    const groups: Record<string, CountryGroup> = {}
    const multi: Record<string, CountryGroup> = {}
    const global: Record<string, CountryGroup> = {}

    products.forEach(product => {
      const country = product.country
      const isGlobal = isGlobalProduct(product)
      const isMulti = isMultiProduct(product)

      // Пропускаем ВСЕ продукты с кириллическими именами стран —
      // это дубли нормально закодированных (AE, TR, JP...) с ценой 0
      if (/[а-яА-ЯёЁ]/.test(country)) return

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
  }, [products])

  // Hydrate from sessionStorage on mount (client-only)
  useEffect(() => {
    const cached = getCachedProducts()
    const savedSearch = getSavedSearch()
    if (savedSearch) setSearchQuery(savedSearch)

    if (cached && cached.length > 0) {
      setProducts(cached)
      dataReadyRef.current = true
      // Кэш есть — пропускаем splash и загрузку
      setShowSplash(false)
      setLoading(false)
    } else {
      void loadProducts()
    }
  }, [loadProducts])

  useEffect(() => {
    groupByCountry()
  }, [groupByCountry])

  useEffect(() => {
    saveSearch(searchQuery)
  }, [searchQuery])

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
    <div className="container animate-fade-in bg-[#f4f5f7] dark:bg-gray-950">
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
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input
            type="text"
            className="w-full py-3 pl-11 pr-10 soft-input text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f77430]/25"
            placeholder="Поиск страны..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            enterKeyHint="search"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="w-full rounded-full bg-white/75 dark:bg-gray-900/75 border border-gray-200 dark:border-gray-800 p-1 flex gap-1.5">
          {[
            { id: 'countries' as const, label: 'Страны' },
            { id: 'multi' as const, label: 'Мульти-страны' },
            { id: 'global' as const, label: 'Глобальный' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium text-center transition-all ${activeTab === tab.id
                  ? 'bg-[#f77430] text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
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
          {filteredCountries.length === 0 ? (
            <div className="card-neutral text-center py-10">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-600 font-medium">Ничего не найдено</p>
              <p className="text-gray-400 text-sm mt-1">Попробуйте другой запрос</p>
            </div>
          ) : (
            <ListSection
              title="Страны"
              items={filteredCountries}
              renderItem={(group, index) => <CountryListRow key={group.country} group={group} index={index} />}
            />
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
              Выберите регион и внутри посмотрите тарифы и страны, которые входят в пакет.
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
              renderItem={(group, index) => <RegionListRow key={group.country} group={group} index={index} />}
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
              Пакеты с широким покрытием. Внутри каждого сразу видно список стран, которые входят в тариф.
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
