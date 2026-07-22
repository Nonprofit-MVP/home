import { createServerSupabaseClient } from '@/lib/supabase'
import { scheduleConversationArticlesRefresh } from '@/lib/articles'
import { HeroSection } from '@/components/home/HeroSection'
import { HomeFeedClient } from '@/components/home/HomeFeedClient'
import type { Article, Paper, User, ReplicationAttempt } from '@/types'

export const revalidate = 60 // ISR: revalidate every 60s

export default async function HomePage() {
  // Refresh feeds in the background — never block TTFB on a multi-feed import
  scheduleConversationArticlesRefresh()

  const supabase = await createServerSupabaseClient()

  // Fetch everything in a single parallel round-trip
  const [
    featuredRes,
    newRes,
    trendingRes,
    repRes,
    papersForContributorsRes,
    articlesRes,
  ] = await Promise.all([
    supabase.from('papers').select('*').eq('status', 'peer_verified').order('citation_count', { ascending: false }).range(0, 9),
    supabase.from('papers').select('*').neq('status', 'draft').order('created_at', { ascending: false }).range(0, 9),
    supabase.from('papers').select('*').neq('status', 'draft').order('view_count', { ascending: false }).range(0, 9),
    supabase.from('replication_attempts').select('*, researcher:users!replication_attempts_researcher_id_fkey(*), paper:papers!replication_attempts_paper_id_fkey(id, title)').order('created_at', { ascending: false }).limit(5),
    supabase.from('papers').select('submitter_id, submitter:users!papers_submitter_id_fkey(*)').neq('status', 'draft').limit(50),
    supabase
      .from('articles')
      .select('*')
      .contains('field_tags', ['canada-english'])
      .order('published_at', { ascending: false })
      .range(0, 8),
  ])

  const featuredPapers = (featuredRes.data as unknown as Paper[]) ?? []
  const newPapers = (newRes.data as unknown as Paper[]) ?? []
  const trendingPapers = (trendingRes.data as unknown as Paper[]) ?? []

  // Build top contributors
  const counts: Record<string, { user: User; count: number }> = {}
  for (const p of (papersForContributorsRes.data ?? []) as any[]) {
    if (p.submitter) {
      if (!counts[p.submitter_id]) counts[p.submitter_id] = { user: p.submitter, count: 0 }
      counts[p.submitter_id].count++
    }
  }
  const topContributors = Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map(c => ({ user: c.user, paperCount: c.count }))

  const replications = ((repRes.data ?? []) as any[]).map(r => ({
    ...r,
    researcher: r.researcher,
    paperTitle: r.paper?.title,
    paperId: r.paper?.id,
  }))

  const initialArticles = articlesRes.error
    ? []
    : ((articlesRes.data as unknown as Article[]) ?? [])

  return (
    <div className="min-h-screen">
      <HeroSection />

      <HomeFeedClient
        initialFeatured={featuredPapers}
        initialNew={newPapers}
        initialTrending={trendingPapers}
        initialArticles={initialArticles}
        initialContributors={topContributors}
        initialReplications={replications}
      />
    </div>
  )
}
