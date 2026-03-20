import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Inter } from 'next/font/google'
import TelegramRedirectHandler from '@/components/TelegramRedirectHandler'
import { AuthProvider } from '@/components/AuthProvider'
import InstallBanner from '@/components/InstallBanner'

const inter = Inter({ subsets: ['latin', 'cyrillic'], weight: ['500', '700'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://mojomobile.ru'),
  title: 'Mojo mobile - Мобильный интернет по всему миру',
  description: 'Покупайте eSIM для путешествий в более чем 100 странах мира через Mojo mobile',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: 'https://mojomobile.ru',
    title: 'Mojo mobile - Мобильный интернет по всему миру',
    description: 'Покупайте eSIM для путешествий в более чем 100 странах мира через Mojo mobile',
    siteName: 'Mojo mobile',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Mojo mobile eSIM',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mojo mobile - Мобильный интернет по всему миру',
    description: 'Покупайте eSIM для путешествий в более чем 100 странах мира через Mojo mobile',
    images: ['/opengraph-image'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Mojo mobile',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f77430',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var SW_VER = 'v2';
                if ('serviceWorker' in navigator && !sessionStorage.getItem('sw_reset_'+SW_VER)) {
                  caches.keys().then(function(names){
                    names.forEach(function(n){ caches.delete(n); });
                  });
                  navigator.serviceWorker.getRegistrations().then(function(regs){
                    regs.forEach(function(r){ r.unregister(); });
                  });
                  sessionStorage.setItem('sw_reset_'+SW_VER, '1');
                  if (navigator.serviceWorker.controller) {
                    location.reload();
                  }
                }
              })();
            `,
          }}
        />
        <script src="https://telegram.org/js/telegram-web-app.js" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (window.Telegram && window.Telegram.WebApp) {
                  var tg = window.Telegram.WebApp;
                  tg.ready();
                  tg.expand();
                  if (tg.themeParams) {
                    var root = document.documentElement;
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
        <script src="https://widget.cloudpayments.ru/bundles/cloudpayments.js" async />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <TelegramRedirectHandler />
          <InstallBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
