'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Package, User, Gift } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', icon: Home, label: 'Главная' },
    { href: '/orders', icon: Package, label: 'Заказы' },
    { href: '/referrals', icon: Gift, label: 'Рефералы' },
    { href: '/profile', icon: User, label: 'Профиль' },
  ]

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={24} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
