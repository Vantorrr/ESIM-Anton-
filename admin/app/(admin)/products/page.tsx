import { Suspense } from 'react'
import ProductsPage from '@/components/products/ProductsPage'
import Spinner from '@/components/ui/Spinner'

export default function ProductsRoutePage() {
  return (
    <Suspense fallback={<Spinner centered />}>
      <ProductsPage />
    </Suspense>
  )
}
