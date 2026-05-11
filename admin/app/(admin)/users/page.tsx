import { Suspense } from 'react'
import Users from '@/components/Users'
import Spinner from '@/components/ui/Spinner'

export default function UsersRoutePage() {
  return (
    <Suspense fallback={<Spinner centered />}>
      <Users />
    </Suspense>
  )
}
