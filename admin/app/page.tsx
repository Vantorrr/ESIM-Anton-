'use client'

import { useState } from 'react'
import { LayoutDashboard, Users as UsersIcon, Package, CreditCard, ShoppingBag, BarChart3, Settings as SettingsIcon } from 'lucide-react'
import Dashboard from '@/components/Dashboard'
import Orders from '@/components/Orders'
import Users from '@/components/Users'
import Products from '@/components/Products'
import Settings from '@/components/Settings'

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const navigation = [
    { id: 'dashboard', name: 'Дашборд', icon: LayoutDashboard },
    { id: 'orders', name: 'Заказы', icon: Package },
    { id: 'users', name: 'Пользователи', icon: UsersIcon },
    { id: 'products', name: 'Продукты', icon: ShoppingBag },
    { id: 'payments', name: 'Платежи', icon: CreditCard },
    { id: 'analytics', name: 'Аналитика', icon: BarChart3 },
    { id: 'settings', name: 'Настройки', icon: SettingsIcon },
  ]

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <div className="glass-card p-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Mojo mobile Admin Panel
            </h1>
            <p className="text-slate-600 mt-1">Управление сервисом Mojo mobile</p>
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
