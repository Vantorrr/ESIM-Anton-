'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { productsApi, Product } from '@/lib/api'
import { formatPrice, getFlagUrl, getCountryName, getCountryCode } from '@/lib/utils'

// Liquid Glass Splash Screen
function SplashScreen({ progress }: { progress: number }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #f2622a 0%, #f77430 64%, #f7b64f 100%)',
        }}
      />

      {/* Watermark pattern in background */}
      <img
        src="/logo-white.png"
        alt=""
        aria-hidden="true"
        className="absolute -top-20 -left-8 w-[420px] max-w-none opacity-10"
      />
      <img
        src="/logo-white.png"
        alt=""
        aria-hidden="true"
        className="absolute -top-14 right-[-140px] w-[360px] max-w-none opacity-10"
      />
      <img
        src="/logo-white.png"
        alt=""
        aria-hidden="true"
        className="absolute bottom-[-120px] left-[-80px] w-[340px] max-w-none opacity-[0.08]"
      />

      <div className={`relative z-10 w-full px-8 flex flex-col items-center transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <img
          src="/logo-white.png"
          alt="Mojo mobile"
          className="w-44 h-44 object-contain drop-shadow-[0_4px_20px_rgba(255,255,255,0.3)]"
          style={{ animation: 'logo-float 2.6s ease-in-out infinite' }}
        />

        <p className="mt-12 text-white/85 text-sm tracking-wide">Подключение к сети</p>

        <div className="mt-3 w-56 h-[3px] bg-white/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(8, progress)}%` }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes logo-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}

// Типы для группировки стран
interface CountryGroup {
  country: string
  minPrice: number
  productCount: number
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

// Ключевые слова для мульти-стран
const MULTI_KEYWORDS = ['europe', 'asia', 'africa', 'america', 'regional', 'multi', 'евро', 'ази', 'афри', 'регион']
const GLOBAL_KEYWORDS = ['global', 'world', 'глобал', 'мир', 'worldwide']

// Liquid Glass карточка страны (iOS style)
function CountryCard({ group, index }: { group: CountryGroup; index: number }) {
  const flagUrl = getFlagUrl(group.country);
  const countryName = getCountryName(group.country);
  
  return (
    <Link href={`/country/${encodeURIComponent(group.country)}`}>
      <div 
        className="
          relative overflow-hidden cursor-pointer
          py-4 px-3
          rounded-2xl
          bg-white/70 dark:bg-white/10
          backdrop-blur-xl
          border border-white/50 dark:border-white/20
          shadow-sm
          transition-all duration-200
          active:scale-[0.98]
          animate-slide-up
        "
        style={{ animationDelay: `${0.03 * index}s` }}
      >
        <div className="text-center">
          <div className="w-12 h-8 mx-auto mb-2 flex items-center justify-center">
            {flagUrl ? (
              <img 
                src={flagUrl} 
                alt={countryName}
                className="w-12 h-auto rounded shadow-sm object-cover"
                loading="lazy"
              />
            ) : (
              <img src="/logo-mark.png" alt="Mojo mobile" className="w-9 h-9 rounded-lg object-contain" />
            )}
          </div>
          <p className="font-medium text-sm text-gray-900 dark:text-white mb-0.5 truncate">
            {countryName}
          </p>
          <p className="text-sm font-semibold text-[#f2622a]">
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
  // Проверяем кэш при инициализации
  const cachedData = getCachedProducts()
  const hasCachedData = cachedData && cachedData.length > 0
  
  const [products, setProducts] = useState<Product[]>(cachedData || [])
  const [loading, setLoading] = useState(!hasCachedData)
  const [showSplash, setShowSplash] = useState(!hasCachedData)
  const [loadProgress, setLoadProgress] = useState(hasCachedData ? 100 : 0)
  const [searchQuery, setSearchQuery] = useState(getSavedSearch())
  const [activeTab, setActiveTab] = useState<'countries' | 'multi' | 'global'>('countries')
  const [countryGroups, setCountryGroups] = useState<CountryGroup[]>([])
  const [multiGroups, setMultiGroups] = useState<CountryGroup[]>([])
  const [globalGroups, setGlobalGroups] = useState<CountryGroup[]>([])
  const [popularCountries, setPopularCountries] = useState<CountryGroup[]>([])

  useEffect(() => {
    // Если есть кэш - не загружаем заново
    if (!hasCachedData) {
      loadProducts()
    }
  }, [])

  useEffect(() => {
    groupByCountry()
  }, [products])

  // Сохраняем поиск при изменении
  useEffect(() => {
    saveSearch(searchQuery)
  }, [searchQuery])

  const loadProducts = async () => {
    try {
      setLoadProgress(10)
      await new Promise(r => setTimeout(r, 200))
      setLoadProgress(30)
      
      const data = await productsApi.getAll({ isActive: true })
      setLoadProgress(70)
      
      setProducts(data)
      setCachedProducts(data) // Сохраняем в кэш
      setLoadProgress(100)
      
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

  const groupByCountry = () => {
    const groups: Record<string, CountryGroup> = {}
    const multi: Record<string, CountryGroup> = {}
    const global: Record<string, CountryGroup> = {}
    
    products.forEach(product => {
      const country = product.country
      const nameLower = (product.name + ' ' + country).toLowerCase()
      
      // Определяем тип
      const isGlobal = GLOBAL_KEYWORDS.some(kw => nameLower.includes(kw))
      const isMulti = !isGlobal && (
        MULTI_KEYWORDS.some(kw => nameLower.includes(kw)) ||
        country.includes(',') ||
        (product.region && product.region.includes(','))
      )
      
      const targetGroups = isGlobal ? global : isMulti ? multi : groups
      
      if (!targetGroups[country]) {
        targetGroups[country] = {
          country,
          minPrice: product.ourPrice,
          productCount: 1,
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
    return <SplashScreen progress={loadProgress} />
  }

  return (
    <div className="container animate-fade-in">
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
            className="w-full py-3 pl-11 pr-10 rounded-xl bg-gray-100/80 dark:bg-white/10 backdrop-blur-sm border-0 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#f77430]/30"
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
      <div className="flex gap-2 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {[
          { id: 'countries' as const, label: 'Страны' },
          { id: 'multi' as const, label: 'Мульти-страны' },
          { id: 'global' as const, label: 'Глобальный' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#f77430] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-[#f29b41]/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl bg-white/50 dark:bg-white/10 backdrop-blur p-4">
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
            <div className="rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur-xl text-center py-10">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">Ничего не найдено</p>
              <p className="text-gray-400 text-sm mt-1">Попробуйте другой запрос</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur-xl overflow-hidden">
              {filteredCountries.map((group, index) => {
                const flagUrl = getFlagUrl(group.country);
                const countryName = getCountryName(group.country);
                return (
                  <Link key={group.country} href={`/country/${encodeURIComponent(group.country)}`}>
                    <div 
                      className={`flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-black/5 active:bg-black/10 transition-colors ${
                        index !== filteredCountries.length - 1 ? 'border-b border-gray-200/50 dark:border-white/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {flagUrl ? (
                          <img src={flagUrl} alt={countryName} className="w-8 h-auto rounded shadow-sm" loading="lazy" />
                        ) : (
                          <img src="/logo-mark.png" alt="Mojo mobile" className="w-8 h-8 rounded-lg object-contain" />
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">{countryName}</span>
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
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Региональные пакеты
          </h2>
          {multiGroups.length === 0 ? (
            <div className="rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur-xl text-center py-10">
              <img src="/logo-mark.png" alt="Mojo mobile" className="w-12 h-12 mx-auto mb-3 rounded-xl object-contain" />
              <p className="text-gray-600 dark:text-gray-300 font-medium">Скоро появятся</p>
              <p className="text-gray-400 text-sm mt-1">Мульти-страны в разработке</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {multiGroups.map((group, index) => (
                <CountryCard key={group.country} group={group} index={index} />
              ))}
            </div>
          )}
        </>
      ) : activeTab === 'global' ? (
        // Глобальный
        <>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Глобальные пакеты
          </h2>
          {globalGroups.length === 0 ? (
            <div className="rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur-xl text-center py-10">
              <img src="/logo-mark.png" alt="Mojo mobile" className="w-12 h-12 mx-auto mb-3 rounded-xl object-contain" />
              <p className="text-gray-600 dark:text-gray-300 font-medium">Скоро появятся</p>
              <p className="text-gray-400 text-sm mt-1">Глобальные тарифы в разработке</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {globalGroups.map((group, index) => (
                <CountryCard key={group.country} group={group} index={index} />
              ))}
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
            <div className="grid grid-cols-2 gap-3">
              {popularCountries.map((group, index) => (
                <CountryCard key={group.country} group={group} index={index} />
              ))}
            </div>
          </div>

          {/* Все страны */}
          <div className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Все страны
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {countryGroups.map((group, index) => (
                <CountryCard key={group.country} group={group} index={index} />
              ))}
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  )
}
