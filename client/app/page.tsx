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

// Custom SVG continent/region icons — white shape on colored background
function RegionSvgIcon({ type }: { type: string }) {
  const base = 'w-5 h-5'
  switch (type) {
    case 'africa':
      return (
        <svg viewBox="0 0 40 40" className={base} fill="white">
          <path d="M20 4C17.5 4 15 5 13.5 7C12 9 12.5 11 12 13C11 14.5 10 16 10.5 18.5C11 21 12.5 23.5 14.5 26C16.5 28.5 18.5 32 20 36C21.5 32 23.5 28.5 25.5 26C27.5 23.5 29 21 29.5 18.5C30 16 29 14.5 28 13C27.5 11 28 9 26.5 7C25 5 22.5 4 20 4Z" />
          <path d="M25 5.5C26 5 28 5.5 28.5 7C29 8.5 27.5 10 26 9.5C24.5 9 24 6 25 5.5Z" />
        </svg>
      )
    case 'europe':
      return (
        <svg viewBox="0 0 40 40" className={base} fill="white">
          {/* Main body */}
          <path d="M14 7L12 9L10 10.5L10 13L12 14.5L11 17L13 19L15 20L17 21L19 20.5L21 21.5L23 20.5L25 19L26.5 17L27 14.5L29 13L29.5 10.5L27.5 9L25 8L22 7L18 7Z" />
          {/* Iberian peninsula */}
          <path d="M11 19L9.5 20.5L9 22.5L10.5 23.5L12 22.5L12.5 20.5Z" />
          {/* Italian peninsula */}
          <path d="M18.5 21L17.5 23.5L18 26L19.5 25.5L20 23.5L19.5 21Z" />
          {/* Scandinavian */}
          <path d="M21 7L23 5L26 6L25 8Z" />
        </svg>
      )
    case 'asia':
      return (
        <svg viewBox="0 0 40 40" className={base} fill="white">
          {/* Main landmass */}
          <path d="M8 10L12 7L17 8L22 7L27 8L31 10L33 13L32 16L34 18L31 21L28 23L25 25L22 28L20 26L17 24L13 23L10 21L8 18L7 15Z" />
          {/* Indian subcontinent */}
          <path d="M22 26L21 29L20 33L21.5 31L23 28Z" />
          {/* SE Asian peninsula */}
          <path d="M27 24L26 27L25 30L26.5 28L28 25Z" />
          {/* Japan */}
          <path d="M33 12L35 11L36 13L34.5 14Z" />
          <path d="M32 14L34 13.5L35 15.5L33.5 16.5Z" />
        </svg>
      )
    case 'north_america':
      return (
        <svg viewBox="0 0 40 40" className={base} fill="white">
          <path d="M8 6L11 5L15 5.5L18 7L20 9L19 12L21 14L18 16.5L15 17.5L12 16.5L10 17.5L8 15.5L7 12.5L7 9Z" />
          {/* Florida */}
          <path d="M17 17L16 19.5L17.5 19L18 17.5Z" />
          {/* Alaska */}
          <path d="M5 8L7 7L8 9L6 9.5Z" />
        </svg>
      )
    case 'south_america':
      return (
        <svg viewBox="0 0 40 40" className={base} fill="white">
          <path d="M14 6L18 5.5L21 7L22 10L21 13.5L23 16L22 20L20 24L18 29L16 34L14 29L12 24L11 20L10 16L12 13L11 9Z" />
        </svg>
      )
    case 'middle_east':
      return (
        <svg viewBox="0 0 40 40" className={base} fill="white">
          {/* Arabian Peninsula */}
          <path d="M14 8L18 7L24 8L27 11L28 15L27 20L24 24L22 27L20 30L19 27L18 24L16 21L14 20L12 17L12 13Z" />
          {/* Mesopotamia / Levant */}
          <path d="M10 9L14 8L14 13L12 15L10 14L9 11Z" />
          {/* Persian Gulf */}
          <path d="M26 15L30 14L32 17L29 19L26 18Z" opacity="0.5" />
        </svg>
      )
    case 'oceania':
      return (
        <svg viewBox="0 0 40 40" className={base} fill="white">
          {/* Australia */}
          <path d="M8 15L12 13L17 12.5L22 13L26 12.5L30 14L32 17L31 21L29 24.5L25 27L20 28L15 27L11 24L8 21Z" />
          {/* Cape York Peninsula */}
          <path d="M27 12.5L29 10.5L31 12L29 14Z" />
          {/* New Zealand North */}
          <path d="M34 19L36 18L37 20.5L35 21.5Z" />
          {/* New Zealand South */}
          <path d="M33 22L35 21.5L36 24L34 25Z" />
        </svg>
      )
    case 'uk':
      return (
        <svg viewBox="0 0 40 40" className={base} fill="white">
          {/* Great Britain */}
          <path d="M19 6L22 5L24 7L24.5 10L25 13L23.5 16L24 19L22 21.5L19 22.5L17 21.5L16 19L16.5 16L15 13L15.5 10L17 7Z" />
          {/* Scotland */}
          <path d="M20.5 5.5L23 4L26 5L24 7L22 6Z" />
          {/* Ireland */}
          <path d="M12 12L15 11L16 13.5L14.5 16L12 16L11 14Z" />
        </svg>
      )
    case 'se_asia':
      return (
        <svg viewBox="0 0 40 40" className={base} fill="white">
          {/* Indochina + peninsula */}
          <path d="M12 7L16 6L20 7L21 10L19 13L17 15L16 18L14.5 16L13 13L11 10Z" />
          {/* Sumatra */}
          <path d="M10 19L15 18L18 20L17 22L12 22L9 21Z" />
          {/* Java */}
          <path d="M15 24L20 23L23 24L22 26L17 26Z" />
          {/* Borneo */}
          <path d="M21 16L26 15L29 18L28 22L25 24L22 23L20 20Z" />
          {/* Philippines */}
          <path d="M28 10L30 9L31 11L29.5 12.5Z" />
          <path d="M30 12L32 11L33 13L31 14Z" />
        </svg>
      )
    case 'central_asia':
      return (
        <svg viewBox="0 0 40 40" className={base} fill="white">
          {/* Central Asian steppe region */}
          <path d="M8 13L13 10L19 11L25 10L30 12L33 16L31 20L27 22L22 23L16 23L11 21L8 18Z" />
          {/* Mountain peaks */}
          <path d="M14 18L17 13L20 18Z" opacity="0.35" fill="white" />
          <path d="M19 17L22 12L25 17Z" opacity="0.35" fill="white" />
        </svg>
      )
    case 'east_asia':
      return (
        <svg viewBox="0 0 40 40" className={base} fill="white">
          {/* China mainland */}
          <path d="M8 10L12 8L17 9L22 8L26 10L28 13L27 17L24 20L20 22L16 22L12 20L9 17L8 14Z" />
          {/* Korean peninsula */}
          <path d="M26 14L28 13.5L29 16L27 18L25 17Z" />
          {/* Japan */}
          <path d="M30 10L32 9L34 11.5L32 13Z" />
          <path d="M29 13L31.5 12.5L33 15L31 16Z" />
          <path d="M28 16L30 15.5L31 18L29.5 19Z" />
          {/* Hainan/Taiwan */}
          <path d="M25 20L27 19L28 21L26.5 22Z" />
        </svg>
      )
    case 'global':
      return (
        <svg viewBox="0 0 40 40" className={base} fill="none" stroke="white" strokeWidth="1.5">
          <circle cx="20" cy="20" r="15" />
          <ellipse cx="20" cy="20" rx="7" ry="15" />
          <path d="M5 20 C9 17 14 15.5 20 15.5 C26 15.5 31 17 35 20" strokeWidth="1" />
          <path d="M5 20 C9 23 14 24.5 20 24.5 C26 24.5 31 23 35 20" strokeWidth="1" />
          <path d="M5 20H35" strokeWidth="1" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 40 40" className={base} fill="none" stroke="white" strokeWidth="1.5">
          <circle cx="20" cy="20" r="15" />
          <ellipse cx="20" cy="20" rx="7" ry="15" />
          <path d="M5 20H35" strokeWidth="1" />
          <path d="M5 20 C9 16 14 14 20 14 C26 14 31 16 35 20" strokeWidth="1" />
        </svg>
      )
  }
}

function getRegionIcon(humanName: string): { type: string; bg: string; color: string } {
  const n = humanName.trim().toLowerCase()

  if (n.includes('европ') || n.includes('балкан'))
    return { type: 'europe', bg: 'bg-blue-500', color: '#3B82F6' }
  if (n.includes('юго-восточ') || n.includes('сингапур') || n.includes('малайзи'))
    return { type: 'se_asia', bg: 'bg-teal-500', color: '#14B8A6' }
  if (n.includes('централ') && n.includes('ази'))
    return { type: 'central_asia', bg: 'bg-amber-600', color: '#D97706' }
  if (n.includes('ази'))
    return { type: 'asia', bg: 'bg-rose-500', color: '#F43F5E' }
  if (n.includes('северная америка') || (n.includes('сша') && n.includes('канад')))
    return { type: 'north_america', bg: 'bg-sky-500', color: '#0EA5E9' }
  if (n.includes('южная америка') || n.includes('карибы') || n.includes('латин'))
    return { type: 'south_america', bg: 'bg-violet-500', color: '#8B5CF6' }
  if (n.includes('ближн') || n.includes('персидск') || n.includes('залив') || n.includes('аравийск'))
    return { type: 'middle_east', bg: 'bg-orange-500', color: '#F97316' }
  if (n.includes('африк'))
    return { type: 'africa', bg: 'bg-yellow-500', color: '#EAB308' }
  if (n.includes('океан') || n.includes('австрал') || n.includes('зеланд'))
    return { type: 'oceania', bg: 'bg-emerald-500', color: '#10B981' }
  if (n.includes('британ') || n.includes('ирланд'))
    return { type: 'uk', bg: 'bg-indigo-600', color: '#4F46E5' }
  if (n.includes('китай') || n.includes('япон') || n.includes('корея'))
    return { type: 'east_asia', bg: 'bg-red-500', color: '#EF4444' }
  if (n.includes('глобальн'))
    return { type: 'global', bg: 'bg-blue-600', color: '#2563EB' }

  return { type: 'default', bg: 'bg-slate-500', color: '#64748B' }
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
            <p className="font-medium text-gray-900 truncate">{countryName}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              от ₽{formatPrice(group.minPrice)}
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
            <RegionSvgIcon type={icon.type} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {group.coverageCount > 1 ? `${group.coverageSummary}` : 'Региональный пакет'} • от ₽{formatPrice(group.minPrice)}
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
  return (
    <Link href={`/country/${encodeURIComponent(group.country)}`}>
      <div
        className="card-neutral flex items-center justify-between px-4 py-3.5 transition-all active:scale-[0.99] animate-slide-up"
        style={{ animationDelay: `${0.03 * index}s` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600">
            <RegionSvgIcon type="global" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">Глобальный пакет</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {group.coverageSummary} • от ₽{formatPrice(group.minPrice)}
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

      // Пропускаем одиночные продукты с кириллическими именами стран —
      // это дубли нормально закодированных (AE, TR, JP...) с некорректными ценами
      if (/[а-яА-ЯёЁ]/.test(country) && !isGlobal && !isMulti) return
      
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
