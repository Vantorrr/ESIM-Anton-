'use client'

import type { FormEvent } from 'react'
import { useEffect, useId, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { normalizeReturnUrl } from '@/lib/auth'

export default function LoginPage() {
  const { login, status } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorId = useId()
  const returnUrl = normalizeReturnUrl(searchParams.get('returnUrl'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    router.replace(returnUrl)
  }, [returnUrl, router, status])

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      const nextPath = await login(email, password, returnUrl)
      setEmail('')
      setPassword('')
      router.replace(nextPath)
    } catch (error: unknown) {
      const errorMessage =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setLoginError(errorMessage || 'Ошибка авторизации')
    } finally {
      setLoginLoading(false)
    }
  }

  if (status === 'unknown' || status === 'authenticated') {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="w-full max-w-md glass-card p-8">
          <Spinner centered />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-md glass-card p-6">
        <h1 className="mb-2 text-2xl font-bold">Вход в админку</h1>
        <p className="mb-5 text-slate-600">Введите логин и пароль администратора</p>

        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (loginError) setLoginError('')
            }}
            placeholder="Email"
            autoComplete="email"
            autoFocus
            aria-describedby={loginError ? errorId : undefined}
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (loginError) setLoginError('')
            }}
            placeholder="Пароль"
            autoComplete="current-password"
            aria-describedby={loginError ? errorId : undefined}
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {loginError ? (
            <p id={errorId} className="text-sm text-red-600">
              {loginError}
            </p>
          ) : null}
          <Button type="submit" disabled={loginLoading} className="w-full justify-center">
            {loginLoading ? 'Вход...' : 'Войти'}
          </Button>
        </form>
      </div>
    </div>
  )
}
