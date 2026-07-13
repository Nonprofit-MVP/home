'use client'

import Link from 'next/link'
import { FileText } from 'lucide-react'
import type { AgentSource } from '@/types'

function hostOf(url?: string): string | null {
  if (!url || url.startsWith('/')) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function faviconOf(url?: string): string | null {
  const host = hostOf(url)
  return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=32` : null
}

function SourceRow({ source, index }: { source: AgentSource; index: number }) {
  const isInternal = source.url?.startsWith('/')
  const meta = [source.venue, source.year].filter(Boolean).join(' · ')
  const favicon = faviconOf(source.url)

  const inner = (
    <>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-[11px] font-mono text-zinc-500">
        {index + 1}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] text-zinc-200 group-hover:text-white transition-colors line-clamp-2 leading-snug">
          {source.title}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-600 font-mono">
          {isInternal ? (
            <FileText className="w-3 h-3 text-[#F5A3FF]/60" />
          ) : favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favicon} alt="" width={12} height={12} className="rounded-sm" />
          ) : null}
          <span className="truncate">{meta || (isInternal ? 'Journality' : hostOf(source.url)) || ''}</span>
          {source.doi && (
            <span className="shrink-0 rounded border border-white/10 px-1 text-zinc-500">DOI</span>
          )}
        </span>
      </span>
    </>
  )

  const className =
    'group flex items-start gap-2.5 rounded-xl border border-white/6 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/12 px-3 py-2.5 transition-colors'

  if (!source.url) return <div className={className}>{inner}</div>
  if (isInternal)
    return (
      <Link href={source.url} className={className}>
        {inner}
      </Link>
    )
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  )
}

export function SourceList({ sources, limit }: { sources: AgentSource[]; limit?: number }) {
  if (!sources.length) return null
  const shown = limit ? sources.slice(0, limit) : sources
  return (
    <div className="mt-4">
      <p className="mb-2 text-[11px] font-mono uppercase tracking-wider text-zinc-600">
        Sources · {sources.length}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {shown.map((source, i) => (
          <SourceRow key={(source.doi || source.url || source.title) + i} source={source} index={i} />
        ))}
      </div>
    </div>
  )
}
