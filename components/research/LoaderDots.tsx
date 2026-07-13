export function LoaderDots({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
      <span className="loader-dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      {label && <span className="font-mono">{label}</span>}
    </span>
  )
}
