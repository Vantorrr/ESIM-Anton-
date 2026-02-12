import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mojo mobile Admin Panel',
  description: 'Панель управления сервисом Mojo mobile',
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
