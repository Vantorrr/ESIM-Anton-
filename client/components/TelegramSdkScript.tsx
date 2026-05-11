'use client'

import Script from 'next/script'

function bootstrapTelegram() {
  const tg = window.Telegram?.WebApp
  if (!tg) return

  try {
    if (tg.initData) {
      tg.ready()
      tg.expand()

      // Попытка развернуть в настоящий full-screen (Bot API 8.0+)
      // if (typeof tg.requestFullscreen === 'function') {
      //   try {
      //     tg.requestFullscreen()
      //   } catch (e) {
      //     console.warn('requestFullscreen failed:', e)
      //   }
      // }

      // Dispatch theme info so ThemeProvider can sync dark/light mode
      if (tg.colorScheme) {
        window.dispatchEvent(new CustomEvent('mojo:telegram-theme', {
          detail: { colorScheme: tg.colorScheme },
        }))
      }
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

