'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  isTelegram: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  isTelegram: false,
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Returns true/false based on Telegram colorScheme, or undefined if not in TG */
function getTelegramDark(): boolean | undefined {
  const cs = window.Telegram?.WebApp?.colorScheme
  if (cs === 'dark') return true
  if (cs === 'light') return false
  return undefined
}

function applyThemeClass(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

/** Resolve effective theme: explicit > Telegram > OS preference */
function resolveTheme(t: Theme, tgDark?: boolean): ResolvedTheme {
  if (t === 'dark') return 'dark'
  if (t === 'light') return 'light'
  if (tgDark !== undefined) return tgDark ? 'dark' : 'light'
  return getSystemTheme()
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')
  const [isTelegram, setIsTelegram] = useState(false)
  const [mounted, setMounted] = useState(false)

  const applyResolved = useCallback((t: Theme, tgDark?: boolean) => {
    const resolved = resolveTheme(t, tgDark)
    setResolvedTheme(resolved)
    applyThemeClass(resolved)
  }, [])

  // Set theme and persist
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    applyResolved(newTheme, getTelegramDark())
  }, [applyResolved])

  // Initialize on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    const initial = saved || 'system'
    setThemeState(initial)

    const tgAvailable = Boolean(window.Telegram?.WebApp?.initData)
    setIsTelegram(tgAvailable)

    applyResolved(initial, tgAvailable ? getTelegramDark() : undefined)
    setMounted(true)
  }, [applyResolved])

  // Listen for Telegram theme changes (dispatched by TelegramSdkScript)
  useEffect(() => {
    function handleTgTheme(e: Event) {
      const detail = (e as CustomEvent<{ colorScheme: string }>).detail
      const tgDark = detail?.colorScheme === 'dark'
      setIsTelegram(true)
      if (theme === 'system') {
        applyResolved('system', tgDark)
      }
    }
    window.addEventListener('mojo:telegram-theme', handleTgTheme)
    return () => window.removeEventListener('mojo:telegram-theme', handleTgTheme)
  }, [theme, applyResolved])

  // Listen for OS preference changes (when theme === 'system' and not in TG)
  useEffect(() => {
    if (theme !== 'system' || isTelegram) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function handler() {
      applyResolved('system')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme, isTelegram, applyResolved])

  // Prevent hydration mismatch — inline script in layout handles initial class
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, isTelegram }}>
      {children}
    </ThemeContext.Provider>
  )
}
