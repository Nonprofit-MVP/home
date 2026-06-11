import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { ArticleBadge } from '@/components/ui/ArticleBadge'
import { TagChip } from '@/components/ui/TagChip'
import { Button } from '@/components/ui/Button'
import type { Article } from '@/types'
import { formatDate, formatAuthors } from '@/lib/utils'
import { appendConversationAnalytics } from '@/lib/conversation'
import { ArrowLeft, ExternalLink } from 'lucide-react'

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('articles')
    .select('title, excerpt')
    .eq('id', params.id)
    .single()

  return {
    title: data ? `${data.title} — Journality` : 'Article — Journality',
    description: data?.excerpt?.slice(0, 160),
  }
}

export default async function ArticlePage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('articles')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!data) notFound()

  const article = data as unknown as Article
  const authors = Array.isArray(article.authors) ? article.authors : []

  supabase
    .from('articles')
    .update({ view_count: (article.view_count || 0) + 1 })
    .eq('id', params.id)
    .then(() => {})

  const articleBody = appendConversationAnalytics(
    article.body,
    article.source_url,
    article.external_id
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <Link
        href="/#articles"
        className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to articles
      </Link>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <ArticleBadge />
          <span className="text-[11px] font-mono text-zinc-600 uppercase tracking-wider">
            {article.source_name}
          </span>
          {article.published_at && (
            <span className="text-xs text-zinc-600">
              {formatDate(article.published_at)}
            </span>
          )}
        </div>

        <h1 className="font-mono text-2xl sm:text-3xl font-bold text-white leading-tight mb-4">
          {article.title}
        </h1>

        <p className="text-sm text-zinc-400 mb-4">{formatAuthors(authors)}</p>

        {authors.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {authors.map((author, index) => (
              author.institution ? (
                <span
                  key={`${author.name}-${index}`}
                  className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-white/8 text-zinc-600"
                >
                  {author.institution}
                </span>
              ) : null
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-white/8">
          <a href={article.source_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-3.5 h-3.5" />
              Read on {article.source_name}
            </Button>
          </a>
        </div>

        {article.cover_image_url && (
          <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-white/8 mb-8">
            <Image
              src={article.cover_image_url}
              alt=""
              fill
              className="object-cover"
              priority
              sizes="(max-width: 896px) 100vw, 896px"
            />
          </div>
        )}

        <p className="text-zinc-400 leading-relaxed text-base mb-8 border-l-2 border-sky-400/30 pl-4">
          {article.excerpt}
        </p>

        {article.field_tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-8">
            {article.field_tags
              .filter((tag) => tag !== 'the-conversation')
              .map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
          </div>
        )}
      </div>

      <div
        className="article-body text-zinc-300 leading-relaxed text-[15px]"
        dangerouslySetInnerHTML={{ __html: articleBody }}
      />
    </div>
  )
}
