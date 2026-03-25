'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthUser, getToken, setToken as saveToken, getStoredUser, setStoredUser, clearToken, isTelegramEnvironment } from '@/lib/auth'
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
      const tgEnv = isTelegramEnvironment()
      setIsTelegram(tgEnv)

      // Шаг 1: сразу восстанавливаем сессию из localStorage — UI показывается мгновенно
      const storedToken = getToken()
      const storedUser = getStoredUser()
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(storedUser)
      }
      setIsLoading(false)

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
            const { data: me } = await api.get('/auth/me', {
              headers: { Authorization: `Bearer ${jwt}` }
            })
            setUser(me)
            setStoredUser(me)
          } catch (e) {
            console.error('Telegram WebApp auth failed:', e)
            // Если нет токена — пробуем find-or-create без JWT
            if (!storedToken) {
              const tgUser = tgApp?.initDataUnsafe?.user
              if (tgUser?.id) {
                try {
                  const { data } = await api.post('/users/find-or-create', {
                    telegramId: Number(tgUser.id),
                    username: tgUser.username,
                    firstName: tgUser.first_name,
                    lastName: tgUser.last_name,
                  })
                  setUser(data)
                  setStoredUser(data)
                } catch {}
              }
            }
          }
        }
      } else if (storedToken) {
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
    <AuthContext.Provider value={{ user, token, isLoading, isTelegram, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
