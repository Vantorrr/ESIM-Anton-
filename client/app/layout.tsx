import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import Script from 'next/script'
import './globals.css'
import TelegramRedirectHandler from '@/components/TelegramRedirectHandler'
import { AuthProvider } from '@/components/AuthProvider'
import InstallBanner from '@/components/InstallBanner'
import TelegramBackButtonProvider from '@/components/TelegramBackButtonProvider'
import TelegramSdkScript from '@/components/TelegramSdkScript'
import ThemeProvider from '@/components/ThemeProvider'

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

// Inline script to apply theme class before first paint (prevents FOUC)
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('theme') || 'system';
    var tg = window.Telegram && window.Telegram.WebApp;
    var tgDark = tg && tg.colorScheme === 'dark';
    var osDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var d = t === 'dark' || (t === 'system' && (tgDark || osDark));
    if (d) document.documentElement.classList.add('dark');
  } catch(e){}
})();
`

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <Script id="pwa-prompt" src="/pwa-prompt.js" strategy="beforeInteractive" />
      </head>
      <body suppressHydrationWarning>
        <Script
          id="sw-reset"
          src="/sw-reset.js"
          strategy="afterInteractive"
        />
        <TelegramSdkScript />
        <Script
          id="cloudpayments-sdk"
          src="https://widget.cloudpayments.ru/bundles/cloudpayments.js"
          strategy="afterInteractive"
        />
        {/* Font stack задаётся в globals.css, чтобы build не зависел от fetch Google Fonts */}
        <AuthProvider>
          <ThemeProvider>
            <TelegramRedirectHandler />
            <TelegramBackButtonProvider />
            <InstallBanner />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

