import Spinner from '@/components/ui/Spinner'

export default function LoginLoading() {
  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <Spinner centered />
    </div>
  )
}
