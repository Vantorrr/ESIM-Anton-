'use client'

import { useRouter } from 'next/navigation'

export function useSmartBack(fallbackRoute: string) {
  const router = useRouter()

  return () => {
    const returnTo = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('returnTo')
      : null
    if (returnTo) {
      router.push(returnTo)
      return
    }

    if (typeof window !== 'undefined' && document.referrer) {
      try {
        const referrer = new URL(document.referrer)
        if (referrer.origin === window.location.origin && window.history.length > 1) {
          router.back()
          return
        }
      } catch {
        // Ignore malformed referrer and use fallback below.
      }
    }

    router.push(fallbackRoute)
  }
}
