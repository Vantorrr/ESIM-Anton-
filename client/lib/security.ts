const SERVER_SAFE_ORIGIN = 'https://app.mojomobile.ru'

function getBaseOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  return SERVER_SAFE_ORIGIN
}

function hasDecodedBackslash(value: string) {
  if (value.includes('\\')) return true

  try {
    return decodeURIComponent(value).includes('\\')
  } catch {
    return true
  }
}

export function sanitizeRedirect(value: string | null | undefined, fallback = '/') {
  const normalizedFallback = fallback.startsWith('/') && !fallback.startsWith('//') ? fallback : '/'
  if (!value) return normalizedFallback

  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return normalizedFallback
  if (hasDecodedBackslash(trimmed)) return normalizedFallback

  try {
    const baseOrigin = getBaseOrigin()
    const url = new URL(trimmed, baseOrigin)

    if (url.origin !== baseOrigin) return normalizedFallback

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return normalizedFallback
  }
}
