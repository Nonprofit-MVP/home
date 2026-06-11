'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Eye, ExternalLink } from 'lucide-react'
import { ArticleBadge } from './ArticleBadge'
import { TagChip } from './TagChip'
import { cn, formatAuthors, formatDate, formatNumber, formatArticleTag } from '@/lib/utils'
import type { Article } from '@/types'

interface ArticleCardProps {
  article: Article
  className?: string
}

export function ArticleCard({ article, className }: ArticleCardProps) {
  const authors = Array.isArray(article.authors) ? article.authors : []
  const authorLine = formatAuthors(authors)
  const displayTags = article.field_tags
    ?.filter((tag) => tag !== 'the-conversation' && tag !== 'canada-english' && tag !== 'canada-french')
    .slice(0, 3) ?? []

  return (
    <Link href={`/articles/${article.id}`} className="block group">
      <article
        className={cn(
          'bg-[#111111] border border-white/8 rounded-lg overflow-hidden transition-all duration-200 h-full',
          'group-hover:-translate-y-0.5 group-hover:shadow-card-hover group-hover:border-white/15',
          className
        )}
      >
        {article.cover_image_url && (
          <div className="relative aspect-[16/9] bg-zinc-900 border-b border-white/5">
            <Image
              src={article.cover_image_url}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <ArticleBadge />
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
              {article.source_name}
            </span>
          </div>

          <h3 className="font-mono text-sm font-medium text-zinc-100 line-clamp-2 leading-snug mb-2 group-hover:text-white transition-colors">
            {article.title}
          </h3>

          <p className="text-xs text-zinc-500 mb-1">{authorLine}</p>

          <p className="text-[13px] text-zinc-500 line-clamp-3 leading-relaxed mb-3">
            {article.excerpt}
          </p>

          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
                {displayTags.map((tag) => (
                  <TagChip key={tag} tag={formatArticleTag(tag)} size="sm" />
                ))}
            </div>
          )}

          <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-600 pt-2 border-t border-white/5">
            <span>{formatDate(article.published_at || article.created_at)}</span>
            <div className="flex items-center gap-1 ml-auto">
              <Eye className="w-3 h-3" />
              <span>{formatNumber(article.view_count)}</span>
            </div>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </article>
    </Link>
  )
}

export function ArticleCardSkeleton() {
  return (
    <div className="bg-[#111111] border border-white/8 rounded-lg overflow-hidden animate-pulse">
      <div className="aspect-[16/9] bg-white/5" />
      <div className="p-4">
        <div className="h-4 w-16 bg-white/5 rounded-full mb-2" />
        <div className="h-4 bg-white/5 rounded mb-1" />
        <div className="h-4 w-3/4 bg-white/5 rounded mb-3" />
        <div className="h-3 w-1/3 bg-white/5 rounded mb-2" />
        <div className="h-3 bg-white/[0.03] rounded mb-1" />
        <div className="h-3 w-5/6 bg-white/[0.03] rounded" />
      </div>
    </div>
  )
}
