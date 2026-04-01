'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function useSmartBack(fallbackRoute: string) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return () => {
    const returnTo = searchParams.get('returnTo')
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
