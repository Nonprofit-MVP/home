'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import type { PaperVersion } from '@/types'

interface ChangelogPanelProps {
  versions: PaperVersion[]
}

function DiffView({ diff }: { diff: string }) {
  const lines = diff.split('\n')
  return (
    <div className="mt-3 bg-black/30 rounded border border-white/5 p-3 font-mono text-xs overflow-x-auto">
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            'leading-relaxed',
            line.startsWith('+') && 'text-emerald-400',
            line.startsWith('-') && 'text-red-400',
            !line.startsWith('+') && !line.startsWith('-') && 'text-zinc-500'
          )}
        >
          {line || ' '}
        </div>
      ))}
    </div>
  )
}

export function ChangelogPanel({ versions }: ChangelogPanelProps) {
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set())

  const toggleDiff = (id: string) => {
    setExpandedDiffs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600">
        <p className="font-mono text-sm">No version history yet</p>
        <p className="text-xs mt-1">Changes will appear here when the paper is updated</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {[...versions].reverse().map((version, i, arr) => {
        const prevVersion = arr[i + 1]
        const versionLabel = prevVersion
          ? `v${prevVersion.version_number}.0 → v${version.version_number}.0`
          : `v${version.version_number}.0`
        const isExpanded = expandedDiffs.has(version.id)

        return (
          <div key={version.id} className="relative pl-6">
            {/* Timeline line */}
            {i < arr.length - 1 && (
              <div className="absolute left-[7px] top-6 bottom-0 w-px bg-white/5" />
            )}
            {/* Timeline dot */}
            <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border border-white/10 bg-[#0a0a0a] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F5A3FF]/50" />
            </div>

            <div className="pb-6">
              <div className="flex items-start gap-3">
                <span className="font-mono text-[11px] text-[#F5A3FF] shrink-0 mt-0.5">{versionLabel}</span>
                <div className="flex-1">
                  <p className="text-xs text-zinc-300">{version.change_summary}</p>
                  <p className="text-[11px] text-zinc-600 font-mono mt-0.5">
                    {version.changer?.full_name || 'Unknown'} · {formatDate(version.created_at)}
                  </p>
                </div>
                {version.content_diff && (
                  <button
                    onClick={() => toggleDiff(version.id)}
                    className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors font-mono shrink-0"
                  >
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    View diff
                  </button>
                )}
              </div>
              {isExpanded && version.content_diff && <DiffView diff={version.content_diff} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}
