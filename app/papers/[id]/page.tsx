import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TagChip } from '@/components/ui/TagChip'
import { Button } from '@/components/ui/Button'
import { AISidebar } from '@/components/paper/AISidebar'
import { ReviewPanel } from '@/components/paper/ReviewPanel'
import { ReplicationLedger } from '@/components/paper/ReplicationLedger'
import { ChangelogPanel } from '@/components/paper/ChangelogPanel'
import { PaperTabs } from './PaperTabs'
import { BookmarkButton } from './BookmarkButton'
import { CiteButton } from './CiteButton'
import { ShareButton } from './ShareButton'
import type { Paper, Review, ReplicationAttempt, PaperVersion } from '@/types'
import { formatDate, formatAuthors } from '@/lib/utils'
import { ExternalLink, FileText, Sparkles } from 'lucide-react'

interface PageProps {
  params: { id: string }
}

function arxivPdfFromSourceUrl(sourceUrl?: string) {
  if (!sourceUrl) return ''
  const match = sourceUrl.match(/https?:\/\/(?:export\.)?arxiv\.org\/abs\/([^?#\s]+)/i)
  if (!match?.[1]) return ''
  return `https://arxiv.org/pdf/${encodeURIComponent(match[1])}.pdf`
}

export async function generateMetadata({ params }: PageProps) {
  // Lightweight — only select what metadata needs
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('papers')
    .select('title, abstract')
    .eq('id', params.id)
    .single()
  return {
    title: data ? `${data.title} — Journality` : 'Paper — Journality',
    description: data?.abstract?.slice(0, 160),
  }
}

export default async function PaperPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient()

  // Fetch everything in parallel — including bookmark
  const [paperResult, reviewsResult, replicationsResult, versionsResult, authResult] =
    await Promise.all([
      supabase.from('papers').select('*').eq('id', params.id).single(),
      supabase.from('reviews').select('*, reviewer:users(*)').eq('paper_id', params.id).order('created_at', { ascending: true }),
      supabase.from('replication_attempts').select('*, researcher:users(*)').eq('paper_id', params.id),
      supabase.from('paper_versions').select('*, changer:users(*)').eq('paper_id', params.id).order('version_number', { ascending: true }),
      supabase.auth.getUser(),
    ])

  if (!paperResult.data) notFound()

  const paper = paperResult.data as unknown as Paper
  const reviews = (reviewsResult.data ?? []) as unknown as Review[]
  const replications = (replicationsResult.data ?? []) as unknown as ReplicationAttempt[]
  const versions = (versionsResult.data ?? []) as unknown as PaperVersion[]
  const currentUser = authResult.data.user
  const effectivePdfUrl = paper.pdf_url || arxivPdfFromSourceUrl(paper.source_url)

  // Bookmark lookup — only if logged in (parallel with render via Promise, not awaited up front)
  let isBookmarked = false
  if (currentUser) {
    const { data: bookmark } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('paper_id', params.id)
      .maybeSingle()
    isBookmarked = !!bookmark
  }

  // Fire-and-forget view count increment — don't block render
  supabase
    .from('papers')
    .update({ view_count: (paper.view_count || 0) + 1 })
    .eq('id', params.id)
    .then(() => {}) // intentionally not awaited

  const authors = Array.isArray(paper.authors) ? paper.authors : []

  // Authors are free-text metadata with no user_id — the only shared identifier
  // with a registered account is ORCID. Resolve ORCID → username so we can link
  // an author to their profile when (and only when) an account actually exists.
  const authorOrcids = authors
    .map((a) => a.orcid)
    .filter((orcid): orcid is string => !!orcid)
  const orcidToUsername = new Map<string, string>()
  if (authorOrcids.length > 0) {
    const { data: matchedUsers } = await supabase
      .from('users')
      .select('username, orcid')
      .in('orcid', authorOrcids)
    for (const u of (matchedUsers ?? []) as { username: string; orcid: string | null }[]) {
      if (u.orcid) orcidToUsername.set(u.orcid, u.username)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Left Column */}
        <div>
          <h1 className="font-mono text-2xl sm:text-3xl font-bold text-white leading-tight mb-4">
            {paper.title}
          </h1>

          <div className="flex flex-wrap gap-2 mb-4">
            {authors.map((author, i) => {
              const username = author.orcid ? orcidToUsername.get(author.orcid) : undefined
              return (
                <div key={i} className="flex items-center gap-1.5">
                  {username ? (
                    <Link
                      href={`/profile/${username}`}
                      className="text-sm text-zinc-300 hover:text-white underline decoration-white/20 hover:decoration-white/60 underline-offset-2 transition-colors"
                    >
                      {author.name}
                    </Link>
                  ) : (
                    <span className="text-sm text-zinc-300">{author.name}</span>
                  )}
                  {author.institution && (
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-white/8 text-zinc-600">
                      {author.institution}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-white/8">
            <StatusBadge status={paper.status} />
            {paper.doi && (
              <span className="font-mono text-xs text-zinc-600">DOI: {paper.doi}</span>
            )}
            {paper.published_at && (
              <span className="text-xs text-zinc-600">Published {formatDate(paper.published_at)}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Link href={`/papers/${paper.id}/read`}>
              <Button variant="primary" size="sm">
                <Sparkles className="w-3.5 h-3.5" />
                Read with AI
              </Button>
            </Link>
            {paper.source_url && (
              <a href={paper.source_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-3.5 h-3.5" />
                  arXiv
                </Button>
              </a>
            )}
            {effectivePdfUrl && (
              <a href={effectivePdfUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <FileText className="w-3.5 h-3.5" />
                  PDF
                </Button>
              </a>
            )}
            <ShareButton />
            <CiteButton paper={paper} />
            <BookmarkButton paperId={paper.id} isLoggedIn={!!currentUser} initialBookmarked={isBookmarked} />
          </div>

          <div id="abstract" className="mb-6 scroll-mt-20">
            <h2 className="text-[11px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Abstract</h2>
            <p className="text-zinc-300 leading-relaxed text-sm">{paper.abstract}</p>
          </div>

          {paper.field_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {paper.field_tags.map(tag => <TagChip key={tag} tag={tag} />)}
            </div>
          )}

          <PaperTabs
            paper={paper}
            reviews={reviews}
            replications={replications}
            versions={versions}
            isLoggedIn={!!currentUser}
          />
        </div>

        {/* Right Column — AI Sidebar */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <AISidebar paper={paper} />
        </div>
      </div>
    </div>
  )
}
