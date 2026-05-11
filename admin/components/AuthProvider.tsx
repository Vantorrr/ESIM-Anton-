'use client'

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi } from '@/lib/api'
import {
  AUTH_LOGOUT_EVENT,
  clearToken,
  getToken,
  normalizeReturnUrl,
  setToken,
} from '@/lib/auth'
import type { AdminAuthUser } from '@/lib/types'

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  status: AuthStatus
  admin: AdminAuthUser | null
  login: (email: string, password: string, returnUrl?: string | null) => Promise<string>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('unknown')
  const [admin, setAdmin] = useState<AdminAuthUser | null>(null)

  useEffect(() => {
    setStatus(getToken() ? 'authenticated' : 'unauthenticated')

    const handleLogout = () => {
      setAdmin(null)
      setStatus('unauthenticated')
    }

    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout)
    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout)
    }
  }, [])

  const login = useCallback(async (email: string, password: string, returnUrl?: string | null) => {
    const { data } = await authApi.login(email, password)
    setToken(data.access_token)
    setAdmin(data.admin)
    setStatus('authenticated')
    return normalizeReturnUrl(returnUrl)
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setAdmin(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      admin,
      login,
      logout,
    }),
    [admin, login, logout, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
