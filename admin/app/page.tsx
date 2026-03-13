'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, Users as UsersIcon, Package, CreditCard, ShoppingBag, BarChart3, Settings as SettingsIcon } from 'lucide-react'
import Dashboard from '@/components/Dashboard'
import Orders from '@/components/Orders'
import Users from '@/components/Users'
import Products from '@/components/Products'
import Settings from '@/components/Settings'

const ADMIN_PIN_STORAGE_KEY = 'admin_pin_verified_v1'
const DEFAULT_ADMIN_PIN = '7391'

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  const validPin = useMemo(
    () => process.env.NEXT_PUBLIC_ADMIN_PIN || DEFAULT_ADMIN_PIN,
    []
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const savedState = localStorage.getItem(ADMIN_PIN_STORAGE_KEY)
    setIsAuthorized(savedState === '1')
  }, [])

  const handlePinSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (pinInput.trim() !== validPin) {
      setPinError('Неверный PIN-код')
      return
    }

    localStorage.setItem(ADMIN_PIN_STORAGE_KEY, '1')
    setPinError('')
    setPinInput('')
    setIsAuthorized(true)
  }

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_PIN_STORAGE_KEY)
    setIsAuthorized(false)
    setActiveTab('dashboard')
  }

  const navigation = [
    { id: 'dashboard', name: 'Дашборд', icon: LayoutDashboard },
    { id: 'orders', name: 'Заказы', icon: Package },
    { id: 'users', name: 'Пользователи', icon: UsersIcon },
    { id: 'products', name: 'Продукты', icon: ShoppingBag },
    { id: 'payments', name: 'Платежи', icon: CreditCard },
    { id: 'analytics', name: 'Аналитика', icon: BarChart3 },
    { id: 'settings', name: 'Настройки', icon: SettingsIcon },
  ]

  if (!isAuthorized) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="w-full max-w-md glass-card p-6">
          <h1 className="text-2xl font-bold mb-2">Вход в админку</h1>
          <p className="text-slate-600 mb-5">
            Введите PIN-код для доступа к панели управления
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-3">
            <input
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value)
                if (pinError) setPinError('')
              }}
              placeholder="PIN-код"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {pinError && (
              <p className="text-sm text-red-600">{pinError}</p>
            )}
            <button
              type="submit"
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-95 transition-opacity"
            >
              Войти
            </button>
            <p className="text-xs text-slate-500">
              Для прода задай `NEXT_PUBLIC_ADMIN_PIN` в переменных окружения админ-сервиса.
            </p>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <div className="glass-card p-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Mojo mobile Admin Panel
              </h1>
              <p className="text-slate-600 mt-1">Управление сервисом Mojo mobile</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white/70 hover:bg-white text-slate-700 text-sm font-medium"
            >
              Выйти
            </button>
          </div>
        </header>

        {/* Navigation */}
        <nav className="mb-8 animate-slide-up">
          <div className="glass-card p-2">
            <div className="flex gap-2 overflow-x-auto">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`
                      flex items-center gap-2 px-6 py-3 rounded-xl font-medium
                      transition-all duration-200 whitespace-nowrap
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                          : 'hover:bg-white/50 text-slate-700'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </button>
                )
              })}
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'orders' && <Orders />}
          {activeTab === 'users' && <Users />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'payments' && <div className="glass-card p-8 text-center text-slate-600">Платежи - в разработке</div>}
          {activeTab === 'analytics' && <div className="glass-card p-8 text-center text-slate-600">Аналитика - в разработке</div>}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  )
}
