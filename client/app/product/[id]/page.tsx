'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Wifi, Clock, CheckCircle2, Zap, Shield, Globe } from 'lucide-react'
import { productsApi, Product, userApi, ordersApi, paymentsApi } from '@/lib/api'
import { formatPrice, formatDataAmount, getCountryEmoji } from '@/lib/utils'

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

  const handlePurchase = async () => {
    if (!product) return
    
    setPurchasing(true)
    
    try {
      // Получаем Telegram user ID
      const tg = (window as any).Telegram?.WebApp;
      const telegramId = tg?.initDataUnsafe?.user?.id || 316662303; // fallback для теста
      
      // Создаем/получаем пользователя
      const user = await userApi.getMe(String(telegramId));
      
      // Создаем заказ
      const order = await ordersApi.create({
        userId: user.id,
        productId: product.id,
        quantity: 1,
      });
      
      // Получаем payment URL от Robokassa
      const { payment } = await paymentsApi.createPayment(order.id);
      
      // Открываем страницу оплаты через Telegram WebApp
      if (tg?.openLink) {
        tg.openLink(payment.paymentUrl);
      } else {
        // Fallback для браузера
        window.open(payment.paymentUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Ошибка оплаты:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Ошибка при создании заказа';
      
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.showAlert) {
        tg.showAlert(errorMsg);
      } else {
        alert(errorMsg);
      }
    } finally {
      setPurchasing(false);
    }
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
          <p className="text-lg font-bold text-primary">{formatDataAmount(product.dataAmount)}</p>
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
              <p className="text-xs text-muted">Активация за 2 минуты</p>
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
            <p className="price-tag text-3xl">₽{formatPrice(product.ourPrice)}</p>
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
              <span>Купить тариф</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom padding for safe area */}
      <div className="h-8" />
    </div>
  )
}
