'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, MapPin, Zap, Calendar, Shield, Award, Minus, Plus, ShoppingCart } from 'lucide-react'
import { productsApi, ordersApi, userApi, Product, User, paymentsApi } from '@/lib/api'

function useTelegramUser() {
  const [tgUser, setTgUser] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const user = window.Telegram.WebApp.initDataUnsafe?.user
      setTgUser(user)
    }
  }, [])

  return tgUser
}

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [useBonuses, setUseBonuses] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
  const tgUser = useTelegramUser()

  useEffect(() => {
    if (params.id) {
      loadProduct()
    }
  }, [params.id])

  useEffect(() => {
    if (tgUser?.id) {
      loadUser()
    }
  }, [tgUser])

  const loadProduct = async () => {
    try {
      const data = await productsApi.getById(params.id as string)
      setProduct(data)
      setLoading(false)
    } catch (error) {
      console.error('Ошибка загрузки продукта:', error)
      setLoading(false)
    }
  }

  const loadUser = async () => {
    try {
      const data = await userApi.getMe(tgUser.id.toString())
      setUser(data)
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error)
    }
  }

  const handlePurchase = async () => {
    if (!product || !user) return

    try {
      setPurchasing(true)

      // Создаём заказ
      const order = await ordersApi.create({
        productId: product.id,
        quantity,
        bonusToUse: useBonuses ? Number(user.bonusBalance) : 0,
      })

      // Создаём платёж
      const payment = await paymentsApi.createPayment(order.id)

      // Открываем ссылку на оплату в Telegram
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openLink(payment.paymentUrl)
      } else {
        window.location.href = payment.paymentUrl
      }

      setPurchasing(false)
    } catch (error) {
      console.error('Ошибка создания заказа:', error)
      setPurchasing(false)
      alert('Ошибка при создании заказа. Попробуйте еще раз.')
    }
  }

  const calculateTotal = () => {
    if (!product) return 0
    
    let total = Number(product.ourPrice) * quantity
    
    // Применяем скидку по уровню лояльности
    if (user?.loyaltyLevel) {
      const discount = (total * Number(user.loyaltyLevel.discount)) / 100
      total -= discount
    }
    
    // Применяем бонусы
    if (useBonuses && user) {
      const bonusToUse = Math.min(Number(user.bonusBalance), total)
      total -= bonusToUse
    }
    
    return total
  }

  if (loading) {
    return (
      <div className="container">
        <div className="mt-6 space-y-4">
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-64 w-full" />
          <div className="skeleton h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container">
        <div className="tg-card text-center py-12 mt-6">
          <p className="tg-hint">Продукт не найден</p>
          <button onClick={() => router.back()} className="tg-button mt-4 max-w-xs mx-auto">
            Назад
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container pb-32">
      {/* Header */}
      <header className="mb-6 mt-6 animate-fade-in">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-4 tg-hint hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={20} />
          <span>Назад</span>
        </button>
      </header>

      {/* Product Card */}
      <div className="tg-card mb-4 animate-slide-up">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">{product.country}</h1>
            <p className="text-lg mb-1">{product.name}</p>
            {product.region && (
              <p className="tg-hint flex items-center gap-1">
                <MapPin size={16} />
                {product.region}
              </p>
            )}
          </div>
        </div>

        {product.description && (
          <p className="tg-hint mb-4">{product.description}</p>
        )}

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
            <Zap size={20} style={{ color: 'var(--tg-theme-button-color)' }} />
            <div>
              <p className="tg-hint text-xs">Данные</p>
              <p className="font-semibold">{product.dataAmount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
            <Calendar size={20} style={{ color: 'var(--tg-theme-button-color)' }} />
            <div>
              <p className="tg-hint text-xs">Срок</p>
              <p className="font-semibold">{product.validityDays} дней</p>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-lg">Цена за 1 eSIM</span>
            <span className="text-2xl font-bold" style={{ color: 'var(--tg-theme-button-color)' }}>
              ₽{Number(product.ourPrice).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Quantity Selector */}
      <div className="tg-card mb-4">
        <h3 className="font-bold mb-3">Количество</h3>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: quantity > 1 ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
              color: quantity > 1 ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-hint-color)',
            }}
          >
            <Minus size={20} />
          </button>
          <span className="text-2xl font-bold">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(10, quantity + 1))}
            disabled={quantity >= 10}
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--tg-theme-button-color)',
              color: 'var(--tg-theme-button-text-color)',
            }}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Bonuses */}
      {user && Number(user.bonusBalance) > 0 && (
        <div className="tg-card mb-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-semibold mb-1">Использовать бонусы</p>
              <p className="tg-hint text-sm">Доступно: ₽{Number(user.bonusBalance).toFixed(2)}</p>
            </div>
            <input
              type="checkbox"
              checked={useBonuses}
              onChange={(e) => setUseBonuses(e.target.checked)}
              className="w-6 h-6"
            />
          </label>
        </div>
      )}

      {/* Loyalty Discount */}
      {user?.loyaltyLevel && Number(user.loyaltyLevel.discount) > 0 && (
        <div className="tg-card mb-4" style={{ background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}>
          <div className="flex items-center gap-2">
            <Award size={20} />
            <div>
              <p className="font-semibold">Ваша скидка: {Number(user.loyaltyLevel.discount)}%</p>
              <p className="text-sm opacity-90">{user.loyaltyLevel.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Purchase */}
      <div
        className="fixed bottom-0 left-0 right-0 p-4"
        style={{ background: 'var(--tg-theme-bg-color)', borderTop: '1px solid var(--tg-theme-secondary-bg-color)' }}
      >
        <div className="max-w-[600px] mx-auto">
          <div className="flex justify-between items-center mb-3">
            <span className="text-lg font-semibold">Итого:</span>
            <span className="text-2xl font-bold" style={{ color: 'var(--tg-theme-button-color)' }}>
              ₽{calculateTotal().toFixed(2)}
            </span>
          </div>
          <button
            onClick={handlePurchase}
            disabled={purchasing}
            className="tg-button flex items-center justify-center gap-2"
          >
            {purchasing ? (
              <span>Создание заказа...</span>
            ) : (
              <>
                <ShoppingCart size={20} />
                <span>Купить</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
