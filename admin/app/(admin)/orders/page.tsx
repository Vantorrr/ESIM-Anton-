import { Suspense } from 'react'
import Orders from '@/components/Orders'
import Spinner from '@/components/ui/Spinner'

export default function OrdersRoutePage() {
  return (
    <Suspense fallback={<Spinner centered />}>
      <Orders />
    </Suspense>
  )
}
