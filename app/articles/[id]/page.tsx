import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import type { Article } from '@/types'
import { formatDate, formatNumber } from '@/lib/utils'
import { formatAuthorsWithUniversities } from '@/lib/canadian-universities'
import { appendConversationAnalytics, stripLeadingCoverImage } from '@/lib/conversation'
import { ArrowLeft, ExternalLink, Eye } from 'lucide-react'

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

async function incrementArticleViews(id: string, current: number) {
  // Articles RLS only allows SELECT for anon — use service role for the bump.
  const admin = createServiceRoleClient()
  const { error } = await admin
    .from('articles')
    .update({ view_count: current + 1 })
    .eq('id', id)

  if (error) {
    console.error('[articles] view_count update failed:', error.message)
    return current
  }
  return current + 1
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
  const viewCount = await incrementArticleViews(
    params.id,
    article.view_count || 0
  )

  const articleBody = stripLeadingCoverImage(
    appendConversationAnalytics(
      article.body ?? '',
      article.source_url,
      article.external_id
    ),
    article.cover_image_url
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
          <span className="text-[11px] font-mono text-zinc-600 uppercase tracking-wider">
            {article.source_name}
          </span>
          {article.published_at && (
            <span className="text-xs text-zinc-600">
              {formatDate(article.published_at)}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-mono text-zinc-600">
            <Eye className="w-3.5 h-3.5" />
            {formatNumber(viewCount)}
          </span>
        </div>

        <h1 className="font-mono text-2xl sm:text-3xl font-bold text-white leading-tight mb-4">
          {article.title}
        </h1>

        <p className="text-sm text-zinc-400 mb-6">
          {formatAuthorsWithUniversities(authors)}
        </p>

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
      </div>

      <div
        className="article-body text-zinc-300 leading-relaxed text-[15px]"
        dangerouslySetInnerHTML={{ __html: articleBody }}
      />
    </div>
  )
}
