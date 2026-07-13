import type { createServerSupabaseClient } from '@/lib/supabase'
import type { OAITool } from './providers'

// The user-scoped (cookie) client — RLS guarantees the agent sees exactly what
// the requesting user could see (public non-draft papers + their own drafts).
export type AgentSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>

export interface InternalToolContext {
  supabase: AgentSupabase
}

// PostgREST's or= filter syntax breaks on commas/parens inside the pattern, so
// strip them from user-supplied queries (same limitation as the Navbar search).
function sanitizeIlikeQuery(query: string): string {
  return String(query || '').replace(/[,()]/g, ' ').trim()
}

async function searchPapers(
  { query, limit = 5 }: Record<string, any>,
  ctx: InternalToolContext
) {
  const q = sanitizeIlikeQuery(query)
  if (!q) return { ok: false, error: 'query is required' }
  const max = Math.min(Math.max(Number(limit) || 5, 1), 10)
  const { data, error } = await ctx.supabase
    .from('papers')
    .select('id,title,abstract,tldr,authors,field_tags,status,doi,created_at')
    .or(`title.ilike.%${q}%,abstract.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(max)
  if (error) return { ok: false, error: error.message }
  return { ok: true, count: data?.length || 0, papers: data || [] }
}

async function getPaper({ id }: Record<string, any>, ctx: InternalToolContext) {
  if (!id) return { ok: false, error: 'id is required' }
  const { data: paper, error } = await ctx.supabase
    .from('papers')
    .select('id,title,abstract,tldr,authors,field_tags,status,doi,view_count,citation_count,replication_score,version,created_at')
    .eq('id', id)
    .single()
  if (error || !paper) return { ok: false, error: error?.message || 'Paper not found' }

  const [{ count: reviewCount }, { data: replications }] = await Promise.all([
    ctx.supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('paper_id', id),
    ctx.supabase.from('replication_attempts').select('outcome').eq('paper_id', id),
  ])

  const replicationSummary: Record<string, number> = {}
  for (const r of replications || []) {
    replicationSummary[r.outcome] = (replicationSummary[r.outcome] || 0) + 1
  }

  return { ok: true, paper, reviewCount: reviewCount || 0, replications: replicationSummary }
}

async function searchArticles(
  { query, limit = 5 }: Record<string, any>,
  ctx: InternalToolContext
) {
  const q = sanitizeIlikeQuery(query)
  if (!q) return { ok: false, error: 'query is required' }
  const max = Math.min(Math.max(Number(limit) || 5, 1), 10)
  const { data, error } = await ctx.supabase
    .from('articles')
    .select('id,title,excerpt,authors,source_name,source_url,field_tags,published_at')
    .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%`)
    .order('published_at', { ascending: false })
    .limit(max)
  if (error) return { ok: false, error: error.message }
  return { ok: true, count: data?.length || 0, articles: data || [] }
}

type InternalToolFn = (args: Record<string, any>, ctx: InternalToolContext) => Promise<unknown>

export const INTERNAL_TOOLS: Record<string, { definition: OAITool; run: InternalToolFn }> = {
  search_journality_papers: {
    definition: {
      type: 'function',
      function: {
        name: 'search_journality_papers',
        description:
          "Search research papers published on Journality (this platform). Call this when the user asks about papers on Journality / 'this site', or to find platform content related to a topic.",
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Keywords to match against paper titles and abstracts' },
            limit: { type: 'number', description: 'Max results (default 5, max 10)' },
          },
          required: ['query'],
          additionalProperties: true,
        },
      },
    },
    run: searchPapers,
  },
  get_journality_paper: {
    definition: {
      type: 'function',
      function: {
        name: 'get_journality_paper',
        description:
          'Get full details of one Journality paper by its UUID, including review count and replication outcomes.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The Journality paper UUID' },
          },
          required: ['id'],
          additionalProperties: true,
        },
      },
    },
    run: getPaper,
  },
  search_journality_articles: {
    definition: {
      type: 'function',
      function: {
        name: 'search_journality_articles',
        description:
          'Search syndicated science journalism articles on Journality (from The Conversation). Use for accessible news-style coverage of research topics.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Keywords to match against article titles and excerpts' },
            limit: { type: 'number', description: 'Max results (default 5, max 10)' },
          },
          required: ['query'],
          additionalProperties: true,
        },
      },
    },
    run: searchArticles,
  },
}
