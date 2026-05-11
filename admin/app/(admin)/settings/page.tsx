import { Suspense } from 'react'
import Settings from '@/components/Settings'
import Spinner from '@/components/ui/Spinner'

export default function SettingsRoutePage() {
  return (
    <Suspense fallback={<Spinner centered />}>
      <Settings />
    </Suspense>
  )
}
