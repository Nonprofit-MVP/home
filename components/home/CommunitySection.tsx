'use client'

import Link from 'next/link'
import { CheckCircle2, RefreshCw, XCircle, ArrowRight } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { formatRelativeDate } from '@/lib/utils'
import type { User } from '@/types'

interface TopContributor {
  user: User
  paperCount: number
}

interface RecentRep {
  id: string
  outcome: 'replicated' | 'partial' | 'failed'
  created_at: string
  researcher?: User
  paperTitle?: string
  paperId?: string
}

interface CommunitySectionProps {
  initialContributors: TopContributor[]
  initialReplications: RecentRep[]
}

const OUTCOME_CONFIG = {
  replicated: { icon: CheckCircle2, color: 'text-teal-400', label: 'Replicated' },
  partial: { icon: RefreshCw, color: 'text-amber-400', label: 'Partial' },
  failed: { icon: XCircle, color: 'text-red-400', label: 'Failed' },
}

export function CommunitySection({ initialContributors, initialReplications }: CommunitySectionProps) {
  const contributors = initialContributors
  const replications = initialReplications
  const loading = false

  return (
    <section className="max-w-7xl mx-auto px-4 pb-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Contributors */}
        <div className="bg-[#111111] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-sm bg-[#F5A3FF]/40" />
              <h2 className="text-xs font-mono font-semibold text-zinc-400 tracking-widest uppercase">
                Top Contributors
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-white/5" />
                  <div className="flex-1">
                    <div className="h-3 w-28 bg-white/5 rounded mb-1" />
                    <div className="h-2.5 w-20 bg-white/[0.03] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : contributors.length === 0 ? (
            <p className="text-xs font-mono text-zinc-700 py-8 text-center">No contributors yet</p>
          ) : (
            <div className="space-y-3">
              {contributors.map((c, i) => (
                <Link
                  key={c.user.id}
                  href={`/profile/${c.user.username}`}
                  className="flex items-center gap-3 group"
                >
                  <span className="text-[11px] font-mono text-zinc-700 w-4 shrink-0">{i + 1}</span>
                  <Avatar src={c.user.avatar_url} name={c.user.full_name || c.user.username} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-zinc-300 group-hover:text-white transition-colors truncate">
                      {c.user.full_name || c.user.username}
                    </p>
                    <p className="text-[11px] text-zinc-600 truncate">{c.user.institution}</p>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-600 shrink-0">
                    {c.paperCount} {c.paperCount === 1 ? 'paper' : 'papers'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Replication Attempts */}
        <div className="bg-[#111111] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-sm bg-[#F5A3FF]/40" />
              <h2 className="text-xs font-mono font-semibold text-zinc-400 tracking-widest uppercase">
                Replication Activity
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-4 h-4 rounded-full bg-white/5 mt-0.5" />
                  <div className="flex-1">
                    <div className="h-3 bg-white/5 rounded mb-1" />
                    <div className="h-2.5 w-24 bg-white/[0.03] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : replications.length === 0 ? (
            <p className="text-xs font-mono text-zinc-700 py-8 text-center">No replications yet</p>
          ) : (
            <div className="space-y-3">
              {replications.map(rep => {
                const cfg = OUTCOME_CONFIG[rep.outcome]
                const Icon = cfg.icon
                return (
                  <div key={rep.id} className="flex items-start gap-3">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      {rep.paperId ? (
                        <Link
                          href={`/papers/${rep.paperId}`}
                          className="text-sm font-mono text-zinc-300 hover:text-white transition-colors line-clamp-1"
                        >
                          {rep.paperTitle || 'Unknown paper'}
                        </Link>
                      ) : (
                        <p className="text-sm font-mono text-zinc-300 line-clamp-1">
                          {rep.paperTitle || 'Unknown paper'}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[11px] font-mono ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-zinc-700">·</span>
                        {rep.researcher && (
                          <Link
                            href={`/profile/${rep.researcher.username}`}
                            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
                          >
                            {rep.researcher.full_name || rep.researcher.username}
                          </Link>
                        )}
                        <span className="text-zinc-700 ml-auto text-[11px]">
                          {formatRelativeDate(rep.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {replications.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <Link
                href="/#feed"
                className="flex items-center gap-1 text-[11px] font-mono text-zinc-600 hover:text-[#F5A3FF] transition-colors"
              >
                <span>Browse all papers</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
