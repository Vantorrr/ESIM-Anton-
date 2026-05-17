/**
 * Определение типа устройства пользователя.
 * Используется для адаптивного показа кнопок активации eSIM.
 */

export type DeviceType = 'ios' | 'android' | 'desktop'

/**
 * Определяет платформу пользователя: iOS, Android или Desktop.
 * Учитывает Telegram WebApp platform, если доступен.
 */
export function detectDevice(): DeviceType {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'desktop'
  }

  // Telegram WebApp даёт точный platform
  const tgPlatform = (window as any).Telegram?.WebApp?.platform
  if (tgPlatform) {
    const p = String(tgPlatform).toLowerCase()
    if (p === 'ios' || p === 'macos') return 'ios'
    if (p === 'android') return 'android'
  }

  const ua = navigator.userAgent.toLowerCase()

  if (/iphone|ipad|ipod/.test(ua)) return 'ios'
  if (/android/.test(ua)) return 'android'

  return 'desktop'
}
