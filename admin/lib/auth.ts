export const AUTH_TOKEN_KEY = 'auth_token'
export const AUTH_LOGOUT_EVENT = 'auth:logout'
export const DEFAULT_AUTHENTICATED_PATH = '/dashboard'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}

export function dispatchAuthLogoutEvent() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT))
}

export function normalizeReturnUrl(
  candidate: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_PATH,
) {
  if (!candidate) return fallback
  if (!candidate.startsWith('/')) return fallback
  if (candidate.startsWith('//')) return fallback
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(candidate)) return fallback
  return candidate
}

export function isUnauthorizedError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  if (!('response' in error)) return false
  const response = (error as { response?: { status?: number } }).response
  return response?.status === 401
}
