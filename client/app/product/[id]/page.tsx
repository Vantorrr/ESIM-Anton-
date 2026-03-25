'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Wifi, Clock, Tag, CreditCard, ChevronRight, Mail } from 'lucide-react'
import { productsApi, Product, userApi, ordersApi, paymentsApi, promoApi } from '@/lib/api'
import { formatPrice, formatDataAmount, getFlagUrl, getCountryName } from '@/lib/utils'
import { useAuth } from '@/components/AuthProvider'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const { user: authUser, token: authToken, isTelegram } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [selectedDays, setSelectedDays] = useState(7)
  const [email, setEmail] = useState('')
  const [emailSaved, setEmailSaved] = useState(false)

  const isDaily = product?.isUnlimited
  const basePrice = isDaily ? product.ourPrice * selectedDays : product?.ourPrice ?? 0
  const discountAmount = promoApplied ? Math.round(basePrice * promoDiscount / 100) : 0
  const totalPrice = basePrice - discountAmount

  useEffect(() => {
    loadProduct()
  }, [params.id])

  useEffect(() => {
    if (authUser?.email && !email) {
      setEmail(authUser.email)
      setEmailSaved(true)
    }
  }, [authUser])

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
      const { getToken } = await import('@/lib/auth')
      let user: any = authUser

      if (!user) {
        const token = authToken || getToken()
        if (token) {
          const { api } = await import('@/lib/api')
          const { data } = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
          user = data
        } else {
          router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`)
          return
        }
      }

      if (!user) throw new Error('Пользователь не найден')

      // Сохраняем email в профиль если его ещё нет
      const userEmail = email.trim() || user.email || ''
      if (userEmail && !user.email) {
        try {
          const { api: apiClient } = await import('@/lib/api')
          const token = authToken || (await import('@/lib/auth')).getToken()
          await apiClient.patch('/users/me/email', { email: userEmail }, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
        } catch { /* non-critical */ }
      }
      
      // Проверяем есть ли уже PENDING заказ на этот продукт (чтобы не создавать дубли)
      let order;
      try {
        const myOrders = await ordersApi.getMy(user.id);
        const pending = (Array.isArray(myOrders) ? myOrders : []).find(
          (o: any) => o.productId === product.id && o.status === 'PENDING'
        );
        const createPayload: any = { userId: user.id, productId: product.id, quantity: 1 };
        if (isDaily && selectedDays > 1) createPayload.periodNum = selectedDays;
        if (promoApplied && promoCode.trim()) createPayload.promoCode = promoCode.trim();
        if (userEmail) createPayload.email = userEmail;
        order = pending || await ordersApi.create(createPayload);
      } catch {
        const createPayload: any = { userId: user.id, productId: product.id, quantity: 1 };
        if (isDaily && selectedDays > 1) createPayload.periodNum = selectedDays;
        if (promoApplied && promoCode.trim()) createPayload.promoCode = promoCode.trim();
        if (userEmail) createPayload.email = userEmail;
        order = await ordersApi.create(createPayload);
      }
      
      const orderTotal = Number(order.totalAmount ?? totalPrice)
      const tg = (window as any).Telegram?.WebApp

      if (orderTotal <= 0) {
        const { api: apiClient } = await import('@/lib/api')
        await apiClient.post(`/orders/${order.id}/fulfill-free`)
        if (tg?.showAlert) {
          tg.showAlert('eSIM активирована! Промокод применён.', () => router.push('/my-esim'))
        } else {
          alert('eSIM активирована! Промокод применён.')
          router.push('/my-esim')
        }
        return
      }

      const widget = new (window as any).cp.CloudPayments();

      widget.pay('charge', {
        publicId: process.env.NEXT_PUBLIC_CLOUDPAYMENTS_PUBLIC_ID,
        description: `Mojo mobile заказ #${order.id.slice(-8)}`,
        amount: orderTotal,
        currency: 'RUB',
        invoiceId: order.id,
        accountId: user.id,
      }, {
        onSuccess: function (options: any) {
          if (tg?.showAlert) {
            tg.showAlert('Оплата прошла успешно!', () => {
               router.push('/my-esim');
            });
          } else {
             alert('Оплата прошла успешно!');
             router.push('/my-esim');
          }
        },
        onFail: function (reason: any, options: any) {
          console.error('Payment failed:', reason);
          if (tg?.showAlert) {
             tg.showAlert('Оплата не прошла. Попробуйте еще раз.');
          } else {
             alert('Оплата не прошла');
          }
        },
        onComplete: function (paymentResult: any, options: any) {
        }
      });

    } catch (error: any) {
      console.error('Ошибка создания заказа:', error);
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
    <div className="container bg-[#f4f5f7]">
      {/* Sticky Back Header */}
      <div className="sticky top-0 z-40 bg-[#f4f5f7]/95 backdrop-blur-sm -mx-5 px-5 pt-2 pb-3 mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-accent font-medium"
        >
          <ArrowLeft size={20} />
          <span>Назад</span>
        </button>
      </div>

      {/* Compact Product Header */}
      <div className="card-neutral p-4 mb-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border border-gray-100">
            {getFlagUrl(product.country) ? (
              <img
                src={getFlagUrl(product.country)}
                alt={getCountryName(product.country)}
                className="w-10 h-auto rounded object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = '/logo-mark.png'; (e.target as HTMLImageElement).className = 'w-9 h-9 rounded-lg object-contain'; }}
              />
            ) : (
              <img src="/logo-mark.png" alt="Mojo mobile" className="w-9 h-9 rounded-lg object-contain" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-primary leading-tight truncate">{getCountryName(product.country)}</h1>
            <p className="text-sm text-secondary truncate">{product.name}</p>
          </div>
        </div>
      </div>

      {/* Order summary */}
      <div className="card-neutral p-4 mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 text-secondary">
            <Wifi size={16} />
            <span className="text-sm">Трафик</span>
          </div>
          <span className="font-semibold text-primary">
            {formatDataAmount(product.dataAmount)}{isDaily ? ' / день' : ''}
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 text-secondary">
            <Clock size={16} />
            <span className="text-sm">Срок действия</span>
          </div>
          <span className="font-semibold text-primary">
            {isDaily ? `${selectedDays} дней` : `${product.validityDays} дней`}
          </span>
        </div>
        {isDaily && (
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <span className="text-sm text-secondary">Цена за день</span>
            <span className="font-semibold text-primary">₽{formatPrice(product.ourPrice)}</span>
          </div>
        )}
      </div>

      {/* Days selector for unlimited/daily plans */}
      {isDaily && (
        <div className="card-neutral p-4 mb-4 animate-slide-up" style={{ animationDelay: '0.12s' }}>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Количество дней</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedDays(d => Math.max(1, d - 1))}
              className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-lg font-bold text-gray-600 active:bg-gray-100"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={365}
              value={selectedDays}
              onChange={(e) => {
                const v = parseInt(e.target.value)
                if (!isNaN(v) && v >= 1 && v <= 365) setSelectedDays(v)
              }}
              className="flex-1 text-center py-2.5 rounded-xl border border-gray-200 bg-white text-lg font-bold text-primary focus:outline-none focus:ring-2 focus:ring-[#f77430]/25"
            />
            <button
              onClick={() => setSelectedDays(d => Math.min(365, d + 1))}
              className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-lg font-bold text-gray-600 active:bg-gray-100"
            >
              +
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            {[3, 5, 7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setSelectedDays(d)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedDays === d
                    ? 'bg-[#f77430] text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {d} дн.
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Promo code */}
      <div className="card-neutral p-4 mb-4 animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Промокод</h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value.toUpperCase())
                setPromoApplied(false)
                setPromoDiscount(0)
                setPromoError('')
              }}
              placeholder="Введите промокод"
              className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f77430]/25 ${
                promoApplied ? 'border-green-400 bg-green-50' : promoError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
              }`}
            />
          </div>
          <button
            onClick={async () => {
              if (!promoCode.trim()) return
              setPromoLoading(true)
              setPromoError('')
              try {
                const res = await promoApi.validate(promoCode)
                setPromoApplied(true)
                setPromoDiscount(res.discountPercent)
              } catch (e: any) {
                setPromoApplied(false)
                setPromoDiscount(0)
                setPromoError(e?.response?.data?.message || 'Промокод не найден')
              } finally {
                setPromoLoading(false)
              }
            }}
            disabled={!promoCode.trim() || promoLoading || promoApplied}
            className="px-4 py-2.5 rounded-xl bg-[#f77430] text-white text-sm font-medium disabled:opacity-40 transition-opacity"
          >
            {promoLoading ? '...' : promoApplied ? '✓' : 'Применить'}
          </button>
        </div>
        {promoApplied && (
          <p className="text-xs text-green-600 mt-2 font-medium">
            Скидка {promoDiscount}% применена! Вы экономите ₽{formatPrice(discountAmount)}
          </p>
        )}
        {promoError && (
          <p className="text-xs text-red-500 mt-2">{promoError}</p>
        )}
      </div>

      {/* Discount summary */}
      {promoApplied && discountAmount > 0 && (
        <div className="card-neutral p-4 mb-4 animate-slide-up bg-green-50 border border-green-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Без скидки</span>
            <span className="text-sm text-gray-400 line-through">₽{formatPrice(basePrice)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-green-700 font-medium">Скидка ({promoDiscount}%)</span>
            <span className="text-sm text-green-700 font-medium">−₽{formatPrice(discountAmount)}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-200">
            <span className="text-sm font-bold text-primary">Итого</span>
            <span className="text-lg font-bold text-primary">₽{formatPrice(totalPrice)}</span>
          </div>
        </div>
      )}

      {/* Email for eSIM delivery */}
      <div className="card-neutral p-4 mb-4 animate-slide-up" style={{ animationDelay: '0.18s' }}>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email для получения eSIM</h3>
        <p className="text-xs text-gray-400 mb-3">Провайдер отправит QR-код на вашу почту</p>
        <div className="relative">
          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailSaved(false) }}
            placeholder="your@email.com (необязательно)"
            className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#f77430]/25 transition-colors ${
              emailSaved ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'
            }`}
          />
        </div>
        {emailSaved && (
          <p className="text-xs text-green-600 mt-1.5 font-medium">✓ Email из вашего профиля</p>
        )}
      </div>

      {/* Payment method */}
      <div className="card-neutral p-4 mb-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Способ оплаты</h3>
        <div className="flex items-center justify-between py-2 px-3 rounded-xl border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <CreditCard size={20} className="text-[#f77430]" />
            <span className="text-sm font-medium text-primary">Банковская карта</span>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </div>
      </div>

      {/* Bottom fixed purchase CTA */}
      <div className="h-28" />
      <div
        className="fixed left-0 right-0 z-[60] px-4"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto">
          <button
            onClick={handlePurchase}
            disabled={purchasing}
            className="w-full py-4 rounded-2xl bg-[#f77430] hover:bg-[#f2622a] text-white font-semibold text-lg transition-colors shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
          >
            {purchasing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Обработка...</span>
              </>
            ) : (
              <span>Оплатить ₽{formatPrice(totalPrice)}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
