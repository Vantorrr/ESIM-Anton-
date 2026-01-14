'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Wifi, Clock, CheckCircle2, Zap, Shield, Globe } from 'lucide-react'
import { productsApi, Product } from '@/lib/api'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => {
    loadProduct()
  }, [params.id])

  const loadProduct = async () => {
    try {
      const data = await productsApi.getById(params.id as string)
      setProduct(data)
      setLoading(false)
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      setLoading(false)
    }
  }

  // Конвертирует ISO код страны в эмодзи флага
  const isoToFlag = (isoCode: string): string => {
    if (isoCode.length !== 2) return '🌍'
    const code = isoCode.toUpperCase()
    const offset = 127397
    return String.fromCodePoint(
      code.charCodeAt(0) + offset,
      code.charCodeAt(1) + offset
    )
  }

  const getCountryEmoji = (country: string): string => {
    if (/^[A-Za-z]{2}$/.test(country)) return isoToFlag(country)
    if (country.includes(',')) return '🌍'
    
    const flags: Record<string, string> = {
      'сша': '🇺🇸', 'турция': '🇹🇷', 'оаэ': '🇦🇪', 'таиланд': '🇹🇭',
      'япония': '🇯🇵', 'китай': '🇨🇳', 'корея': '🇰🇷', 'сингапур': '🇸🇬',
      'united states': '🇺🇸', 'turkey': '🇹🇷', 'japan': '🇯🇵',
    }
    return flags[country.toLowerCase()] || '🌍'
  }

  const handlePurchase = async () => {
    if (!product) return
    
    setPurchasing(true)
    
    // TODO: Интеграция с платежной системой
    // Пока показываем сообщение
    setTimeout(() => {
      setPurchasing(false)
      alert('Функция оплаты будет доступна после интеграции с платёжной системой')
    }, 1000)
  }

  if (loading) {
    return (
      <div className="container">
        <div className="glass-card mb-6">
          <div className="skeleton w-20 h-20 rounded-2xl mx-auto mb-4" />
          <div className="skeleton h-6 w-32 mx-auto mb-2" />
          <div className="skeleton h-4 w-48 mx-auto" />
        </div>
        <div className="glass-card">
          <div className="skeleton h-8 w-24 mb-4" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-full mb-2" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container">
        <div className="glass-card text-center py-12">
          <p className="text-secondary text-lg">Продукт не найден</p>
          <button onClick={() => router.back()} className="glass-button mt-4">
            Вернуться
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Back Button */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-accent font-medium mb-6 animate-fade-in"
      >
        <ArrowLeft size={20} />
        <span>Назад</span>
      </button>

      {/* Product Header */}
      <div className="glass-card text-center mb-6 animate-slide-up">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-5xl mx-auto mb-4 shadow-sm">
          {getCountryEmoji(product.country)}
        </div>
        <h1 className="text-2xl font-bold text-primary mb-1">{product.country}</h1>
        <p className="text-secondary">{product.name}</p>
        {product.region && (
          <p className="text-muted text-sm mt-1">{product.region}</p>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="glass-card-flat text-center">
          <Wifi className="mx-auto mb-2 text-accent" size={28} />
          <p className="text-lg font-bold text-primary">{product.dataAmount}</p>
          <p className="text-xs text-muted">Трафик</p>
        </div>
        <div className="glass-card-flat text-center">
          <Clock className="mx-auto mb-2 text-accent" size={28} />
          <p className="text-lg font-bold text-primary">{product.validityDays} дней</p>
          <p className="text-xs text-muted">Срок действия</p>
        </div>
      </div>

      {/* Benefits */}
      <div className="glass-card mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <h3 className="font-semibold text-primary mb-4">Преимущества</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Zap className="text-green-500" size={20} />
            </div>
            <div>
              <p className="font-medium text-primary">Мгновенная активация</p>
              <p className="text-xs text-muted">Получите eSIM за 2 минуты</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Globe className="text-blue-500" size={20} />
            </div>
            <div>
              <p className="font-medium text-primary">Работает везде</p>
              <p className="text-xs text-muted">Стабильное покрытие</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Shield className="text-purple-500" size={20} />
            </div>
            <div>
              <p className="font-medium text-primary">Безопасно</p>
              <p className="text-xs text-muted">Защищённое соединение</p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="glass-card mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h3 className="font-semibold text-primary mb-4">Как это работает</h3>
        <div className="space-y-3">
          {[
            'Оплатите eSIM',
            'Получите QR-код',
            'Отсканируйте в настройках',
            'Пользуйтесь интернетом',
          ].map((step, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-sm font-bold shrink-0">
                {index + 1}
              </div>
              <p className="text-secondary">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase Section */}
      <div className="glass-card animate-slide-up" style={{ animationDelay: '0.25s' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-muted text-sm">Стоимость</p>
            <p className="price-tag text-3xl">₽{product.ourPrice}</p>
          </div>
          <div className="badge badge-success">
            <CheckCircle2 size={14} className="mr-1" />
            В наличии
          </div>
        </div>
        
        <button
          onClick={handlePurchase}
          disabled={purchasing}
          className="glass-button flex items-center justify-center gap-2"
        >
          {purchasing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Обработка...</span>
            </>
          ) : (
            <>
              <span>Купить eSIM</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom padding for safe area */}
      <div className="h-8" />
    </div>
  )
}
