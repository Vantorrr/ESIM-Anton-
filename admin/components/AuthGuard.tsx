'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { normalizeReturnUrl } from '@/lib/auth'
import Spinner from '@/components/ui/Spinner'
import { useAuth } from './AuthProvider'

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== 'unauthenticated') return

    const query = typeof window === 'undefined' ? '' : window.location.search.slice(1)
    const returnUrl = normalizeReturnUrl(query ? `${pathname}?${query}` : pathname, pathname)
    const nextUrl = `/login?returnUrl=${encodeURIComponent(returnUrl)}`

    router.push(nextUrl)
  }, [pathname, router, status])

  if (status === 'unknown') {
    return (
      <div className="min-h-screen p-6">
        <div className="glass-card p-8">
          <Spinner centered />
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return <>{children}</>
}
