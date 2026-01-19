'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Wifi, Clock, ChevronRight, Sparkles, Globe, Signal } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { productsApi, Product } from '@/lib/api'
import { formatPrice, formatDataAmount, getCountryEmoji } from '@/lib/utils'

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
                      <p className="price-tag">₽{formatPrice(product.ourPrice)}</p>
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Wifi size={14} />
                      <span>{formatDataAmount(product.dataAmount)}</span>
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
