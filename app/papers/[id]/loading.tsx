export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div>
          <div className="h-8 bg-white/5 rounded mb-4 w-3/4" />
          <div className="h-8 bg-white/5 rounded mb-4 w-1/2" />
          <div className="flex gap-2 mb-6 pb-6 border-b border-white/5">
            <div className="h-6 w-24 bg-white/5 rounded-full" />
            <div className="h-6 w-32 bg-white/5 rounded" />
          </div>
          <div className="space-y-2 mb-6">
            <div className="h-4 bg-white/[0.03] rounded" />
            <div className="h-4 bg-white/[0.03] rounded" />
            <div className="h-4 w-4/5 bg-white/[0.03] rounded" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-48 bg-white/[0.03] rounded-xl" />
          <div className="h-64 bg-white/[0.03] rounded-xl" />
        </div>
      </div>
    </div>
  )
}
