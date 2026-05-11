import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Вход — Mojo Mobile Admin',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
