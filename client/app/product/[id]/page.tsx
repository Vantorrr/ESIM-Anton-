'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Wifi, Clock, Tag, CreditCard, Mail, Wallet } from '@/components/icons'
import { productsApi, Product, userApi, ordersApi, promoApi } from '@/lib/api'
import { formatPrice, formatDataAmount, getFlagUrl, getCountryName } from '@/lib/utils'
import { getCoverageItems, getCoverageScopeLabel, getCoverageSummary } from '@/lib/productCoverage'
import { useAuth } from '@/components/AuthProvider'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: authUser, token: authToken } = useAuth()
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
  const [balance, setBalance] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'card'>('card')
  // autoBuy=1 — пользователь вернулся с /balance после успешного пополнения,
  // нужно сразу запустить покупку с баланса. Гард не даёт вызвать дважды.
  const autoBuyTriggeredRef = useRef(false)

  const isDaily = product?.isUnlimited
  const basePrice = isDaily ? product.ourPrice * selectedDays : product?.ourPrice ?? 0
  const discountAmount = promoApplied ? Math.round(basePrice * promoDiscount / 100) : 0
  const totalPrice = basePrice - discountAmount
  const coverageItems = product ? getCoverageItems(product) : []
  const coverageSummary = product ? getCoverageSummary(product) : ''
  const trafficSummary = product
    ? product.isUnlimited
      ? `${formatDataAmount(product.dataAmount)} каждый день`
      : `${formatDataAmount(product.dataAmount)} на весь срок тарифа`
    : ''
  const validitySummary = product
    ? product.isUnlimited
      ? `${selectedDays} дней использования`
      : `${product.validityDays} дней использования`
    : ''
  const returnTo = searchParams.get('returnTo')

  useEffect(() => {
    if (authUser?.email && !email) {
      setEmail(authUser.email)
      setEmailSaved(true)
    }
  }, [authUser, email])

  // Загружаем актуальный баланс пользователя для тоггла «С баланса / Картой».
  useEffect(() => {
    let cancelled = false
    const loadBalance = async () => {
      if (!authUser?.id) {
        if (!cancelled) setBalance(0)
        return
      }
      try {
        const profile = await userApi.getProfile(authUser.id)
        if (!cancelled) setBalance(Number(profile.balance) || 0)
      } catch {
        if (!cancelled) setBalance(0)
      }
    }
    loadBalance()
    return () => {
      cancelled = true
    }
  }, [authUser?.id])

  // Если баланса хватает, по умолчанию выбираем оплату с баланса (один клик
  // вместо открытия виджета). Если не хватает — оставляем «Картой».
  useEffect(() => {
    if (totalPrice <= 0) {
      setPaymentMethod('card')
      return
    }

    if (balance !== null && balance >= totalPrice) {
      setPaymentMethod('balance')
    } else {
      setPaymentMethod('card')
    }
  }, [balance, totalPrice])

  const loadProduct = useCallback(async () => {
    try {
      const data = await productsApi.getById(params.id as string)
      setProduct(data)
      setLoading(false)
    } catch (error) {
      console.error('Ошибка загрузки:', error)
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    void loadProduct()
  }, [loadProduct])

  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo)
      return
    }

    if (product?.country) {
      router.push(`/country/${encodeURIComponent(product.country)}`)
      return
    }

    router.push('/')
  }

  /**
   * Покупка тарифа.
   *
   * Поведение зависит от `methodOverride`/`paymentMethod`:
   *  - `'balance'` && баланса хватает → POST /orders {paymentMethod:'balance'},
   *    бэк атомарно списывает и сразу выдаёт eSIM, мы редиректим в /my-esim;
   *  - `'balance'` && баланса не хватает → редирект в /balance с auto-topup
   *    на нужную разницу и `returnTo` обратно сюда с `autoBuy=1`;
   *  - `'card'` → текущий CloudPayments-flow с PENDING заказом и виджетом.
   */
  const handlePurchase = async (methodOverride?: 'balance' | 'card') => {
    if (!product) return

    const method = methodOverride ?? paymentMethod

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
          router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`)
          return
        }
      }

      if (!user) throw new Error('Пользователь не найден')

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

      const tg = (window as any).Telegram?.WebApp

      // === Ветка «Покупка с баланса» ===
      if (method === 'balance' && totalPrice > 0) {
        const userBalance = Number(balance ?? 0)
        // Если баланса не хватает — редирект на /balance с auto-topup и returnTo
        if (userBalance < totalPrice) {
          const need = Math.ceil(totalPrice - userBalance)
          const currentUrl = window.location.pathname + window.location.search
          // autoBuy=1 в returnTo — после возврата автоматически вызовем покупку
          const sep = currentUrl.includes('?') ? '&' : '?'
          const returnTo = `${currentUrl}${sep}autoBuy=1`
          router.push(`/balance?topup=${need}&returnTo=${encodeURIComponent(returnTo)}`)
          return
        }

        const createPayload: any = { productId: product.id, quantity: 1, paymentMethod: 'balance' }
        if (isDaily && selectedDays > 1) createPayload.periodNum = selectedDays
        if (promoApplied && promoCode.trim()) createPayload.promoCode = promoCode.trim()
        if (userEmail) createPayload.email = userEmail

        await ordersApi.create(createPayload)

        if (tg?.showAlert) {
          tg.showAlert('eSIM выдана! Открываю «Мои eSIM»…', () => router.push('/my-esim'))
        } else {
          router.push('/my-esim')
        }
        return
      }

      // === Ветка «Картой» — старый flow с CloudPayments ===
      let order;
      try {
        const myOrders = await ordersApi.getMy(user.id);
        const pending = (Array.isArray(myOrders) ? myOrders : []).find(
          (o: any) => o.productId === product.id && o.status === 'PENDING'
        );
        const createPayload: any = { productId: product.id, quantity: 1 };
        if (isDaily && selectedDays > 1) createPayload.periodNum = selectedDays;
        if (promoApplied && promoCode.trim()) createPayload.promoCode = promoCode.trim();
        if (userEmail) createPayload.email = userEmail;
        order = pending || await ordersApi.create(createPayload);
      } catch {
        const createPayload: any = { productId: product.id, quantity: 1 };
        if (isDaily && selectedDays > 1) createPayload.periodNum = selectedDays;
        if (promoApplied && promoCode.trim()) createPayload.promoCode = promoCode.trim();
        if (userEmail) createPayload.email = userEmail;
        order = await ordersApi.create(createPayload);
      }

      const orderTotal = Number(order.totalAmount ?? totalPrice)

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
        onSuccess: function () {
          if (tg?.showAlert) {
            tg.showAlert('Оплата прошла успешно!', () => router.push('/my-esim'))
          } else {
            alert('Оплата прошла успешно!')
            router.push('/my-esim')
          }
        },
        onFail: function (reason: any) {
          console.error('Payment failed:', reason)
          if (tg?.showAlert) tg.showAlert('Оплата не прошла. Попробуйте еще раз.')
          else alert('Оплата не прошла')
        },
        onComplete: function () {},
      })

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

  // Авто-докупка после возврата с /balance: дождёмся загрузки product+balance,
  // удостоверимся что баланса теперь хватает, и один раз дёрнем покупку.
  useEffect(() => {
    if (autoBuyTriggeredRef.current) return
    if (searchParams.get('autoBuy') !== '1') return
    if (!product || balance === null) return
    if (totalPrice <= 0 || balance < totalPrice) return

    autoBuyTriggeredRef.current = true
    void handlePurchase('balance')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, balance, totalPrice, searchParams])

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
          <button onClick={handleBack} className="glass-button mt-4">
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
          onClick={handleBack}
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
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-[#f77430]">
                {product.isUnlimited ? 'Ежедневный пакет' : 'Фиксированный пакет'}
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700">
                {getCoverageScopeLabel(product)}: {coverageSummary}
              </span>
            </div>
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
        <div className="flex items-center justify-between py-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-secondary">
            <span className="text-sm">Где работает</span>
          </div>
          <span className="font-semibold text-primary text-right max-w-[60%]">{coverageSummary}</span>
        </div>
      </div>

      {/* What is included */}
      <div className="card-neutral p-4 mb-4 animate-slide-up" style={{ animationDelay: '0.11s' }}>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Что входит в тариф</h3>
        <div className="space-y-3">
          <div className="rounded-xl bg-white border border-gray-100 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Трафик</p>
            <p className="text-sm font-semibold text-primary">{trafficSummary}</p>
            <p className="text-xs text-gray-500 mt-1">
              {product.isUnlimited
                ? 'Лимит обновляется каждый день в течение выбранного периода.'
                : 'Весь объём можно использовать в любой день до окончания срока.'}
            </p>
          </div>

          <div className="rounded-xl bg-white border border-gray-100 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Срок действия</p>
            <p className="text-sm font-semibold text-primary">{validitySummary}</p>
            {product.description && (
              <p className="text-xs text-gray-500 mt-1">{product.description}</p>
            )}
          </div>

          <div className="rounded-xl bg-white border border-gray-100 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Покрытие</p>
            <p className="text-sm font-semibold text-primary">{coverageSummary}</p>
            <p className="text-xs text-gray-500 mt-1">
              {coverageItems.length > 1
                ? 'Ниже показаны страны, которые входят в этот пакет.'
                : `Пакет работает в зоне ${coverageSummary}.`}
            </p>
            {coverageItems.length > 1 && (
              <details className="mt-2 group">
                <summary className="list-none cursor-pointer text-xs font-medium text-[#f77430]">
                  Показать страны ({coverageItems.length})
                </summary>
                <div className="flex flex-wrap gap-2 mt-2">
                  {coverageItems.map(item => (
                    <span
                      key={item}
                      className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </details>
            )}
          </div>

          <div className="rounded-xl bg-white border border-gray-100 px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Подключение</p>
            <p className="text-sm font-semibold text-primary">Только мобильный интернет</p>
            <p className="text-xs text-gray-500 mt-1">Звонки и SMS в тариф не входят.</p>
          </div>

          {product.isUnlimited && product.speed && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-amber-600 mb-1">После лимита в день</p>
              <p className="text-sm font-semibold text-amber-900">Скорость снижается до {product.speed}</p>
            </div>
          )}

          {/* Теги и примечание из админки — универсально */}
          {(() => {
            const tags = product.tags ?? []
            if (tags.length === 0 && !product.notes) return null
            return (
              <div className="rounded-xl bg-yellow-50 border border-yellow-100 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-yellow-700 mb-1">Примечание</p>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {product.notes && (
                  <p className="text-sm text-yellow-900 mt-1 whitespace-pre-line">{product.notes}</p>
                )}
              </div>
            )
          })()}
        </div>
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

      {/* Payment method — тоггл «С баланса / Картой» */}
      <div className="card-neutral p-4 mb-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Способ оплаты</h3>
        <div className="grid grid-cols-2 gap-2">
          {(() => {
            const userBalance = Number(balance ?? 0)
            const enoughBalance = userBalance >= totalPrice && totalPrice > 0
            return (
              <>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('balance')}
                  className={`flex flex-col items-start text-left px-3 py-3 rounded-xl border transition-all ${
                    paymentMethod === 'balance'
                      ? 'border-[#f77430] bg-orange-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wallet size={18} className={paymentMethod === 'balance' ? 'text-[#f77430]' : 'text-gray-500'} />
                    <span className={`text-sm font-medium ${paymentMethod === 'balance' ? 'text-[#f77430]' : 'text-primary'}`}>
                      С баланса
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    {balance === null
                      ? '…'
                      : enoughBalance
                        ? `Доступно ₽${formatPrice(userBalance)}`
                        : `Не хватает ₽${formatPrice(totalPrice - userBalance)}`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-start text-left px-3 py-3 rounded-xl border transition-all ${
                    paymentMethod === 'card'
                      ? 'border-[#f77430] bg-orange-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard size={18} className={paymentMethod === 'card' ? 'text-[#f77430]' : 'text-gray-500'} />
                    <span className={`text-sm font-medium ${paymentMethod === 'card' ? 'text-[#f77430]' : 'text-primary'}`}>
                      Картой
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">Visa, MC, МИР</span>
                </button>
              </>
            )
          })()}
        </div>
      </div>

      {/* Bottom fixed purchase CTA */}
      <div className="h-28" />
      <div
        className="fixed left-0 right-0 z-[60] px-4"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto">
          {(() => {
            const userBalance = Number(balance ?? 0)
            const enoughBalance = userBalance >= totalPrice && totalPrice > 0
            const showTopupCta = paymentMethod === 'balance' && !enoughBalance && totalPrice > 0 && balance !== null
            const need = Math.max(0, Math.ceil(totalPrice - userBalance))
            return (
              <button
                onClick={() => handlePurchase()}
                disabled={purchasing}
                className="w-full py-4 rounded-2xl bg-[#f77430] hover:bg-[#f2622a] text-white font-semibold text-lg transition-colors shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
              >
                {purchasing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Обработка...</span>
                  </>
                ) : showTopupCta ? (
                  <span>Пополнить на ₽{formatPrice(need)} и купить</span>
                ) : paymentMethod === 'balance' ? (
                  <span>Купить с баланса · ₽{formatPrice(totalPrice)}</span>
                ) : (
                  <span>Оплатить картой · ₽{formatPrice(totalPrice)}</span>
                )}
              </button>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
