import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'eSIM Admin Panel',
  description: 'Панель управления сервисом продажи eSIM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
