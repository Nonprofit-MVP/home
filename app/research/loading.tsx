export default function ResearchLoading() {
  return (
    <div className="h-[calc(100vh-3.5rem)] max-w-7xl mx-auto md:grid md:grid-cols-[280px_1fr]">
      <aside className="hidden md:flex flex-col border-r border-white/8 p-3 space-y-2">
        <div className="h-8 bg-white/[0.04] rounded animate-pulse" />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-12 bg-white/[0.03] rounded-lg animate-pulse" />
        ))}
      </aside>
      <main className="flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-mono text-zinc-500">
          <span className="loader-dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          Loading research workspace…
        </div>
      </main>
    </div>
  )
}
