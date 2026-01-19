'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Globe, Signal } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { productsApi, Product } from '@/lib/api'
import { formatPrice, getCountryEmoji } from '@/lib/utils'

// Animated Network Lines Component
function NetworkLines() {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
          <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
          <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Animated connection lines */}
      {[...Array(6)].map((_, i) => (
        <line
          key={i}
          x1={`${20 + i * 15}%`}
          y1={`${30 + (i % 3) * 20}%`}
          x2={`${50 + (i % 4) * 10}%`}
          y2={`${40 + (i % 2) * 30}%`}
          stroke="url(#lineGrad)"
          strokeWidth="1"
          className="animate-pulse"
          style={{ animationDelay: `${i * 0.3}s`, animationDuration: '2s' }}
        />
      ))}
    </svg>
  )
}

// Floating Particles Component
function FloatingParticles() {
  const particles = [
    { size: 4, x: 15, y: 20, delay: 0, duration: 3 },
    { size: 6, x: 85, y: 30, delay: 0.5, duration: 4 },
    { size: 3, x: 25, y: 70, delay: 1, duration: 3.5 },
    { size: 5, x: 75, y: 80, delay: 1.5, duration: 2.5 },
    { size: 4, x: 50, y: 15, delay: 2, duration: 3 },
    { size: 3, x: 10, y: 50, delay: 0.3, duration: 4 },
    { size: 5, x: 90, y: 60, delay: 0.8, duration: 3 },
    { size: 4, x: 40, y: 85, delay: 1.2, duration: 3.5 },
  ]

  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-float"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: 0.4,
          }}
        />
      ))}
    </>
  )
}

// Liquid Glass Splash Screen
function SplashScreen({ progress }: { progress: number }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 bg-[#0a0a1a]">
        {/* Mesh gradient layers */}
        <div 
          className="absolute inset-0 opacity-80"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 20% 40%, rgba(56, 189, 248, 0.25) 0%, transparent 50%),
              radial-gradient(ellipse 60% 80% at 80% 50%, rgba(168, 85, 247, 0.25) 0%, transparent 50%),
              radial-gradient(ellipse 50% 60% at 50% 80%, rgba(34, 197, 94, 0.15) 0%, transparent 50%)
            `
          }}
        />
        
        {/* Aurora effect */}
        <div 
          className={`absolute inset-0 transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}
          style={{
            background: `
              radial-gradient(ellipse 100% 40% at 50% 0%, rgba(56, 189, 248, 0.3) 0%, transparent 70%)
            `,
            animation: 'aurora 8s ease-in-out infinite',
          }}
        />
        
        {/* Network lines */}
        <NetworkLines />
        
        {/* Floating particles */}
        <FloatingParticles />
        
        {/* Animated gradient orbs */}
        <div 
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.3) 0%, transparent 70%)',
            top: '20%',
            left: '-20%',
            animation: 'float 6s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(192, 132, 252, 0.3) 0%, transparent 70%)',
            bottom: '10%',
            right: '-15%',
            animation: 'float 8s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Glass container */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Animated Logo */}
        <div className="relative mb-10">
          {/* Outer ring */}
          <div 
            className="absolute -inset-4 rounded-full border border-white/10"
            style={{ animation: 'spin 20s linear infinite' }}
          />
          <div 
            className="absolute -inset-8 rounded-full border border-white/5"
            style={{ animation: 'spin 30s linear infinite reverse' }}
          />
          
          {/* Main logo container */}
          <div className="relative w-32 h-32 rounded-[2rem] bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-2xl overflow-hidden">
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/20" />
            
            {/* Globe icon with pulse effect */}
            <div className="relative">
              <Globe 
                className="w-16 h-16 text-white" 
                style={{ animation: 'pulse-scale 2s ease-in-out infinite' }}
              />
              {/* Signal waves */}
              <div className="absolute -inset-4 border-2 border-white/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute -inset-8 border border-white/10 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            </div>
          </div>
          
          {/* Ambient glow */}
          <div 
            className="absolute inset-0 w-32 h-32 rounded-[2rem] blur-3xl -z-10"
            style={{
              background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.5), rgba(192, 132, 252, 0.5))',
              animation: 'pulse 3s ease-in-out infinite',
            }}
          />
        </div>

        {/* Title with gradient */}
        <h1 
          className="text-5xl font-bold mb-3 tracking-tight bg-clip-text text-transparent"
          style={{
            backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #ffffff 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradient-shift 3s ease-in-out infinite',
          }}
        >
          eSIM
        </h1>
        <p className="text-white/50 text-lg mb-10 font-light tracking-wide">
          Интернет по всему миру
        </p>

        {/* Progress bar with glow */}
        <div className="relative w-72">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #38bdf8, #a78bfa, #34d399)',
              }}
            >
              {/* Shimmer effect */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
            </div>
          </div>
          {/* Progress glow */}
          <div 
            className="absolute top-0 left-0 h-1 rounded-full blur-sm transition-all duration-500"
            style={{ 
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #38bdf8, #a78bfa, #34d399)',
              opacity: 0.5,
            }}
          />
        </div>

        {/* Loading status */}
        <div className="mt-6 flex items-center gap-3 text-white/40 text-sm">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div 
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.6s' }}
              />
            ))}
          </div>
          <span>Подключение к сети</span>
        </div>

        {/* Features badges with stagger animation */}
        <div className="mt-14 flex gap-4">
          {[
            { icon: '🌍', text: '100+ стран' },
            { icon: '⚡', text: 'Мгновенно' },
            { icon: '🛡️', text: '24/7' },
          ].map((item, i) => (
            <div 
              key={item.text}
              className={`px-5 py-2.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-white/70 text-sm flex items-center gap-2 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: `${0.3 + i * 0.1}s` }}
            >
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes aurora {
          0%, 100% { transform: translateX(-10%) rotate(0deg); opacity: 0.3; }
          50% { transform: translateX(10%) rotate(5deg); opacity: 0.6; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
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
          <div className="text-4xl mb-2">
            {getCountryEmoji(group.country)}
          </div>
          <p className="font-medium text-sm text-gray-900 dark:text-white mb-0.5 truncate">
            {group.country}
          </p>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
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
  } catch {}
  return null
}

function setCachedProducts(data: Product[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {}
}

function getSavedSearch(): string {
  if (typeof window === 'undefined') return ''
  try {
    return sessionStorage.getItem(SEARCH_KEY) || ''
  } catch {}
  return ''
}

function saveSearch(query: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SEARCH_KEY, query)
  } catch {}
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

  const filteredCountries = searchQuery
    ? countryGroups.filter(g => 
        g.country.toLowerCase().includes(searchQuery.toLowerCase())
      )
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Globe className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">eSIM</h1>
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
            className="w-full py-3 pl-11 pr-10 rounded-xl bg-gray-100/80 dark:bg-white/10 backdrop-blur-sm border-0 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
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
              {filteredCountries.map((group, index) => (
                <Link key={group.country} href={`/country/${encodeURIComponent(group.country)}`}>
                  <div 
                    className={`flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-black/5 active:bg-black/10 transition-colors ${
                      index !== filteredCountries.length - 1 ? 'border-b border-gray-200/50 dark:border-white/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getCountryEmoji(group.country)}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{group.country}</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
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
              <div className="text-4xl mb-3">🌍</div>
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
              <div className="text-4xl mb-3">🌐</div>
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
