'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatDate } from '@/lib/utils'
import type { Review } from '@/types'

interface ReviewPanelProps {
  reviews: Review[]
  paperId: string
}

const RECOMMENDATION_CONFIG = {
  accept: { label: 'Accept', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  minor_revision: { label: 'Minor Revision', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  major_revision: { label: 'Major Revision', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  reject: { label: 'Reject', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-zinc-600 font-mono w-24">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={cn(
              'w-4 h-1.5 rounded-sm',
              i <= score ? 'bg-[#F5A3FF]' : 'bg-white/5'
            )}
          />
        ))}
      </div>
      <span className="text-[11px] text-zinc-500 font-mono">{score}/5</span>
    </div>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(true)
  const config = review.recommendation ? RECOMMENDATION_CONFIG[review.recommendation] : null

  return (
    <div className="border border-white/8 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
        )}
        <div className="flex items-center gap-2 flex-1">
          {review.is_anonymous ? (
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center">
              <span className="text-[9px] font-mono text-zinc-500">?</span>
            </div>
          ) : (
            <Avatar name={review.reviewer?.full_name || 'Reviewer'} size="sm" />
          )}
          <div>
            <p className="text-xs font-mono text-zinc-300">
              {review.is_anonymous ? 'Anonymous Reviewer' : review.reviewer?.full_name}
            </p>
            <p className="text-[11px] text-zinc-600">Round {review.round} · {formatDate(review.created_at)}</p>
          </div>
        </div>
        {config && (
          <span className={cn(
            'text-[10px] font-mono px-2 py-0.5 rounded-full border',
            config.color
          )}>
            {config.label}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5">
          {/* Scores */}
          {(review.significance_score || review.methodology_score || review.clarity_score) && (
            <div className="flex flex-col gap-1.5 py-3 border-b border-white/5 mb-3">
              {review.significance_score && <ScoreBar label="Significance" score={review.significance_score} />}
              {review.methodology_score && <ScoreBar label="Methodology" score={review.methodology_score} />}
              {review.clarity_score && <ScoreBar label="Clarity" score={review.clarity_score} />}
            </div>
          )}
          {/* Comments */}
          {review.comments && (
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{review.comments}</p>
          )}
        </div>
      )}
    </div>
  )
}

export function ReviewPanel({ reviews, paperId }: ReviewPanelProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600">
        <p className="font-mono text-sm">No reviews yet</p>
        <p className="text-xs mt-1">This paper is awaiting peer review</p>
      </div>
    )
  }

  // Group by round
  const rounds = reviews.reduce((acc, r) => {
    const round = r.round
    if (!acc[round]) acc[round] = []
    acc[round].push(r)
    return acc
  }, {} as Record<number, Review[]>)

  return (
    <div className="space-y-6">
      {Object.entries(rounds).map(([round, roundReviews]) => (
        <div key={round}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[11px] font-mono text-zinc-600 px-2">Round {round}</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <div className="space-y-3">
            {roundReviews.map(review => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
