'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, QrCode, Copy, CheckCircle, Download, Info } from 'lucide-react'
import { ordersApi, Order } from '@/lib/api'

function getStatusBadge(status: Order['status']) {
  const badges = {
    PENDING: { label: 'Ожидает оплаты', class: 'badge-warning', icon: '⏳' },
    PAID: { label: 'Оплачен', class: 'badge-info', icon: '✅' },
    PROCESSING: { label: 'Обработка', class: 'badge-info', icon: '⚙️' },
    COMPLETED: { label: 'Выполнен', class: 'badge-success', icon: '🎉' },
    FAILED: { label: 'Ошибка', class: 'badge-error', icon: '❌' },
    REFUNDED: { label: 'Возврат', class: 'badge-warning', icon: '💰' },
    CANCELLED: { label: 'Отменён', class: 'badge-error', icon: '🚫' },
  }
  
  return badges[status] || { label: status, class: 'badge-info', icon: '📦' }
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (params.id) {
      loadOrder()
    }
  }, [params.id])

  const loadOrder = async () => {
    try {
      const data = await ordersApi.getById(params.id as string)
      setOrder(data)
      setLoading(false)
    } catch (error) {
      console.error('Ошибка загрузки заказа:', error)
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Ошибка копирования:', error)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="mt-6 space-y-4">
          <div className="skeleton h-8 w-32" />
          <div className="skeleton h-64 w-full" />
          <div className="skeleton h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container">
        <div className="tg-card text-center py-12 mt-6">
          <p className="tg-hint">Заказ не найден</p>
          <button onClick={() => router.push('/orders')} className="tg-button mt-4 max-w-xs mx-auto">
            К моим заказам
          </button>
        </div>
      </div>
    )
  }

  const badge = getStatusBadge(order.status)
  const isCompleted = order.status === 'COMPLETED'

  return (
    <div className="container pb-20">
      {/* Header */}
      <header className="mb-6 mt-6 animate-fade-in">
        <button
          onClick={() => router.push('/orders')}
          className="flex items-center gap-2 mb-4 tg-hint hover:opacity-70 transition-opacity"
        >
          <ArrowLeft size={20} />
          <span>К моим заказам</span>
        </button>
        <h1 className="text-2xl font-bold">Заказ #{order.id.slice(0, 8)}</h1>
      </header>

      {/* Status */}
      <div className="tg-card mb-4 text-center animate-slide-up">
        <div className="text-5xl mb-3">{badge.icon}</div>
        <span className={`badge ${badge.class} text-base`}>{badge.label}</span>
        <p className="tg-hint text-sm mt-2">
          {new Date(order.createdAt).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* QR Code */}
      {isCompleted && order.qrCode && (
        <div className="tg-card mb-4 text-center">
          <h3 className="font-bold mb-3 flex items-center justify-center gap-2">
            <QrCode size={20} />
            QR-код для активации
          </h3>
          <div className="bg-white p-4 rounded-lg inline-block mb-3">
            <img src={order.qrCode} alt="QR Code" className="w-64 h-64 mx-auto" />
          </div>
          <p className="tg-hint text-sm mb-4">
            Отсканируйте этот QR-код в настройках вашего телефона для активации eSIM
          </p>
          <button
            onClick={() => {
              // Открываем QR-код в полном размере
              if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.openLink(order.qrCode!)
              }
            }}
            className="tg-button-outline flex items-center justify-center gap-2 mx-auto"
          >
            <Download size={16} />
            Скачать QR-код
          </button>
        </div>
      )}

      {/* eSIM Details */}
      {isCompleted && (order.iccid || order.activationCode) && (
        <div className="tg-card mb-4">
          <h3 className="font-bold mb-3">Данные eSIM</h3>
          <div className="space-y-3">
            {order.iccid && (
              <div>
                <p className="tg-hint text-sm mb-1">ICCID</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded text-sm" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
                    {order.iccid}
                  </code>
                  <button
                    onClick={() => copyToClipboard(order.iccid!, 'ICCID')}
                    className="p-2 rounded"
                    style={{ background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
                  >
                    {copied === 'ICCID' ? <CheckCircle size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
            )}
            {order.activationCode && (
              <div>
                <p className="tg-hint text-sm mb-1">Код активации</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded text-sm" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
                    {order.activationCode}
                  </code>
                  <button
                    onClick={() => copyToClipboard(order.activationCode!, 'код')}
                    className="p-2 rounded"
                    style={{ background: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
                  >
                    {copied === 'код' ? <CheckCircle size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Info */}
      <div className="tg-card mb-4">
        <h3 className="font-bold mb-3">Информация о товаре</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="tg-hint">Страна</span>
            <span className="font-semibold">{order.product.country}</span>
          </div>
          <div className="flex justify-between">
            <span className="tg-hint">Тариф</span>
            <span className="font-semibold">{order.product.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="tg-hint">Данные</span>
            <span className="font-semibold">{order.product.dataAmount}</span>
          </div>
          <div className="flex justify-between">
            <span className="tg-hint">Срок действия</span>
            <span className="font-semibold">{order.product.validityDays} дней</span>
          </div>
          <div className="flex justify-between">
            <span className="tg-hint">Количество</span>
            <span className="font-semibold">{order.quantity}</span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="tg-card mb-4">
        <h3 className="font-bold mb-3">Стоимость</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="tg-hint">Цена товара</span>
            <span>₽{Number(order.productPrice).toFixed(2)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between" style={{ color: 'var(--tg-theme-button-color)' }}>
              <span>Скидка</span>
              <span>-₽{Number(order.discount).toFixed(2)}</span>
            </div>
          )}
          {Number(order.bonusUsed) > 0 && (
            <div className="flex justify-between" style={{ color: 'var(--tg-theme-button-color)' }}>
              <span>Бонусы</span>
              <span>-₽{Number(order.bonusUsed).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-gray-200 text-lg font-bold">
            <span>Итого</span>
            <span style={{ color: 'var(--tg-theme-button-color)' }}>
              ₽{Number(order.totalAmount).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {isCompleted && (
        <div className="tg-card" style={{ background: 'var(--tg-theme-secondary-bg-color)' }}>
          <div className="flex gap-3">
            <Info size={20} className="tg-hint flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold mb-2">Как активировать eSIM?</h4>
              <ol className="tg-hint text-sm space-y-1 list-decimal list-inside">
                <li>Откройте Настройки → Сотовая связь</li>
                <li>Нажмите "Добавить eSIM"</li>
                <li>Выберите "Использовать QR-код"</li>
                <li>Отсканируйте QR-код выше</li>
                <li>Следуйте инструкциям на экране</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
