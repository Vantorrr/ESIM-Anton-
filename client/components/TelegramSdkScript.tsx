'use client'

import Script from 'next/script'

function bootstrapTelegram() {
  const tg = (window as any).Telegram?.WebApp
  if (!tg) return

  try {
    tg.ready()
    tg.expand()

    if (tg.themeParams) {
      const root = document.documentElement
      root.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff')
      root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000')
      root.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999')
      root.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc')
      root.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc')
      root.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff')
      root.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f4f4f5')
    }

    window.dispatchEvent(new Event('mojo:telegram-sdk-ready'))
  } catch {
    console.warn('Telegram WebApp bootstrap failed')
  }
}

export default function TelegramSdkScript() {
  return (
    <Script
      id="telegram-sdk"
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="afterInteractive"
      onLoad={bootstrapTelegram}
      onError={() => console.warn('Telegram WebApp SDK failed to load')}
    />
  )
}
