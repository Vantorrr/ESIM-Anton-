'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { AuthUser, getToken, setToken as saveToken, getStoredUser, setStoredUser, clearToken, isTelegramEnvironment } from '@/lib/auth'
import { api } from '@/lib/api'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  isTelegram: boolean
  authError: 'telegram-auth-required' | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  isTelegram: false,
  authError: null,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: any }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTelegram, setIsTelegram] = useState(false)
  const [authError, setAuthError] = useState<'telegram-auth-required' | null>(null)

  useEffect(() => {
    const init = async () => {
      const tgEnv = isTelegramEnvironment()
      setIsTelegram(tgEnv)
      setAuthError(null)

      // Шаг 1: сразу восстанавливаем сессию из localStorage — UI показывается мгновенно
      const storedToken = getToken()
      const storedUser = getStoredUser()
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(storedUser)
      }

      // Шаг 2: фоновая верификация / обновление токена
      if (tgEnv) {
        // Ждём загрузки Telegram SDK (async скрипт), max 2s
        let tgApp = (window as any).Telegram?.WebApp
        if (!tgApp?.initData) {
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 100))
            tgApp = (window as any).Telegram?.WebApp
            if (tgApp?.initData) break
          }
        }

        if (tgApp?.initData) {
          try {
            const { data } = await api.post('/auth/telegram/webapp', { initData: tgApp.initData })
            const jwt = data.access_token
            saveToken(jwt)
            setToken(jwt)
            setAuthError(null)
            const { data: me } = await api.get('/auth/me', {
              headers: { Authorization: `Bearer ${jwt}` }
            })
            setUser(me)
            setStoredUser(me)
          } catch (e) {
            console.error('Telegram WebApp auth failed:', e)
            if (!storedToken) {
              setToken(null)
              setUser(null)
              setAuthError('telegram-auth-required')
            }
          }
        } else if (!storedToken) {
          setToken(null)
          setUser(null)
          setAuthError('telegram-auth-required')
        }
        setIsLoading(false)
      } else if (storedToken) {
        setIsLoading(false)
        // Тихая фоновая верификация токена
        try {
          const { data } = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` }
          })
          setUser(data)
          setStoredUser(data)
        } catch (e: any) {
          const status = e?.response?.status
          if (status === 401 || status === 403) {
            clearToken()
            setToken(null)
            setUser(null)
          }
        }
      } else {
        setIsLoading(false)
      }
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
    <AuthContext.Provider value={{ user, token, isLoading, isTelegram, authError, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
