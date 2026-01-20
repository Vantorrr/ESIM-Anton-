'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Store, User, HelpCircle } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', icon: Store, label: 'Магазин' },
    { href: '/profile', icon: User, label: 'Аккаунт' },
    { href: '/help', icon: HelpCircle, label: 'Помощь' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href === '/' && pathname.startsWith('/country')) ||
            (item.href === '/' && pathname.startsWith('/product')) ||
            (item.href === '/profile' && pathname.startsWith('/orders')) ||
            (item.href === '/profile' && pathname.startsWith('/referrals')) ||
            (item.href === '/profile' && pathname.startsWith('/my-esim'))
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive 
                  ? 'text-blue-500' 
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
