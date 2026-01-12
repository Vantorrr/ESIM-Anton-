import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'eSIM Service - Мобильный интернет по всему миру',
  description: 'Покупайте eSIM для путешествий в более чем 100 странах мира',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Telegram WebApp initialization
                if (window.Telegram && window.Telegram.WebApp) {
                  const tg = window.Telegram.WebApp;
                  tg.ready();
                  tg.expand();
                  
                  // Apply Telegram theme colors
                  if (tg.themeParams) {
                    const root = document.documentElement;
                    root.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
                    root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
                    root.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
                    root.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
                    root.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
                    root.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
                    root.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f4f4f5');
                  }
                }
              })();
            `,
          }}
        />
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
