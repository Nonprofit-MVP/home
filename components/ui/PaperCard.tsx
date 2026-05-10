'use client'

import Link from 'next/link'
import { Eye, Quote, BarChart2 } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { TagChip } from './TagChip'
import { cn, formatAuthors, formatDate, formatNumber } from '@/lib/utils'
import type { Paper } from '@/types'

interface PaperCardProps {
  paper: Paper
  className?: string
  compact?: boolean
  href?: string | null
}

export function PaperCard({ paper, className, compact = false, href }: PaperCardProps) {
  const authors = Array.isArray(paper.authors) ? paper.authors : []
  const authorLine = formatAuthors(authors)
  const institution = authors.length === 1 ? authors[0]?.institution : null
  const displayTags = paper.field_tags?.slice(0, 3) || []
  const extraTags = (paper.field_tags?.length || 0) - 3

  const resolvedHref = href === undefined ? `/papers/${paper.id}` : href
  const card = (
    <article
      className={cn(
        'bg-[#111111] border border-white/8 rounded-lg p-4 transition-all duration-200',
        'group-hover:-translate-y-0.5 group-hover:shadow-card-hover group-hover:border-white/15',
        className
      )}
    >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <StatusBadge status={paper.status} size="sm" />
          {paper.replication_score > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-500">
              <BarChart2 className="w-3 h-3" />
              <span>{paper.replication_score.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="font-mono text-sm font-medium text-zinc-100 line-clamp-2 leading-snug mb-2 group-hover:text-white transition-colors">
          {paper.title}
        </h3>

        {!compact && (
          <>
            {/* Authors */}
            <p className="text-xs text-zinc-500 mb-1">
              {authorLine}
              {institution && <span className="text-zinc-600"> · {institution}</span>}
            </p>

            {/* TL;DR */}
            {paper.tldr && (
              <p className="text-[13px] text-zinc-500 line-clamp-2 leading-relaxed mb-3">
                {paper.tldr}
              </p>
            )}

            {/* Tags */}
            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {displayTags.map((tag) => (
                  <TagChip key={tag} tag={tag} size="sm" />
                ))}
                {extraTags > 0 && (
                  <span className="text-[10px] text-zinc-600 font-mono self-center">+{extraTags} more</span>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-600 pt-2 border-t border-white/5">
              {paper.doi && <span className="truncate max-w-[100px]">{paper.doi}</span>}
              <span className="ml-auto">{formatDate(paper.created_at)}</span>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{formatNumber(paper.view_count)}</span>
              </div>
              {paper.citation_count > 0 && (
                <div className="flex items-center gap-1">
                  <Quote className="w-3 h-3" />
                  <span>{formatNumber(paper.citation_count)}</span>
                </div>
              )}
            </div>
          </>
        )}

        {compact && (
          <p className="text-xs text-zinc-600 font-mono mt-1">{authorLine}</p>
        )}
    </article>
  )

  if (resolvedHref) {
    return (
      <Link href={resolvedHref} className="block group">
        {card}
      </Link>
    )
  }

  return <div className="block group">{card}</div>
}

export function PaperCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="bg-[#111111] border border-white/8 rounded-lg p-4 animate-pulse">
      <div className="h-4 w-20 bg-white/5 rounded-full mb-2" />
      <div className="h-4 bg-white/5 rounded mb-1" />
      <div className="h-4 w-3/4 bg-white/5 rounded mb-3" />
      {!compact && (
        <>
          <div className="h-3 w-1/3 bg-white/5 rounded mb-2" />
          <div className="h-3 bg-white/[0.03] rounded mb-1" />
          <div className="h-3 w-5/6 bg-white/[0.03] rounded mb-3" />
          <div className="flex gap-1 mb-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 w-16 bg-white/[0.03] rounded" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
