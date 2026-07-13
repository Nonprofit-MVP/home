'use client'

import { useEffect, useState } from 'react'
import { Cpu } from 'lucide-react'

export interface ProviderOption {
  id: string
  label: string
  model: string
}

export function ProviderSelect({
  value,
  onChange,
}: {
  value: string | null
  onChange: (id: string) => void
}) {
  const [providers, setProviders] = useState<ProviderOption[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/agent/providers')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data) return
        setProviders(data.providers || [])
        if (!value && data.default) onChange(data.default)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!providers.length) return null

  return (
    <div className="flex items-center gap-1.5">
      <Cpu className="w-3 h-3 text-zinc-600" />
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent border border-white/10 rounded px-1.5 py-1 text-[11px] font-mono text-zinc-400 focus:outline-none focus:border-[#F5A3FF]/30 hover:border-white/20 transition-colors cursor-pointer [&>option]:bg-[#111111]"
      >
        {providers.map(p => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  )
}
