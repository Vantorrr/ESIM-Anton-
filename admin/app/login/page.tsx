import { Suspense } from 'react'
import LoginPage from '@/components/LoginPage'
import Spinner from '@/components/ui/Spinner'

export default function LoginRoutePage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-6 flex items-center justify-center"><Spinner centered /></div>}>
      <LoginPage />
    </Suspense>
  )
}
