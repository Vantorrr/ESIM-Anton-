import Spinner from '@/components/ui/Spinner'

export default function AdminLoading() {
  return (
    <div className="min-h-screen p-6">
      <div className="glass-card p-8">
        <Spinner centered />
      </div>
    </div>
  )
}
