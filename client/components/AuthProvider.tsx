'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthUser, getToken, setToken as saveToken, getStoredUser, setStoredUser, clearToken, isTelegramWebApp, getTelegramUserId } from '@/lib/auth'
import { api } from '@/lib/api'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isTelegram: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  isTelegram: false,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTelegram, setIsTelegram] = useState(false)

  useEffect(() => {
    const init = async () => {
      const tgMode = isTelegramWebApp()
      setIsTelegram(tgMode)

      if (tgMode) {
        // Telegram Mini App - use existing flow
        const telegramId = getTelegramUserId()
        if (telegramId) {
          try {
            const { data } = await api.post('/users/find-or-create', {
              telegramId: Number(telegramId),
              username: (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.username,
              firstName: (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.first_name,
              lastName: (window as any).Telegram?.WebApp?.initDataUnsafe?.user?.last_name,
            })
            setUser(data)
            setStoredUser(data)
          } catch (e) {
            console.error('Failed to init Telegram user:', e)
          }
        }
      } else {
        // PWA / Browser - use JWT token
        const storedToken = getToken()
        const storedUser = getStoredUser()

        if (storedToken && storedUser) {
          setToken(storedToken)
          setUser(storedUser)
          // Verify token is still valid
          try {
            const { data } = await api.get('/auth/me', {
              headers: { Authorization: `Bearer ${storedToken}` }
            })
            setUser(data)
            setStoredUser(data)
          } catch {
            clearToken()
            setToken(null)
            setUser(null)
          }
        }
      }

      setIsLoading(false)
    }

    init()
  }, [])

  const login = (newToken: string, newUser: AuthUser) => {
    setToken(newToken)
    setUser(newUser)
    saveToken(newToken)
    setStoredUser(newUser)
  }

  const logout = () => {
    clearToken()
    setToken(null)
    setUser(null)
  }

  const refreshUser = async () => {
    const currentToken = token || getToken()
    if (!currentToken) return
    try {
      const { data } = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` }
      })
      setUser(data)
      setStoredUser(data)
    } catch (e) {
      console.error('Failed to refresh user:', e)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isTelegram, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
