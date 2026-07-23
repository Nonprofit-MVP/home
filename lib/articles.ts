import { createServiceRoleClient } from '@/lib/supabase'
import { parseAtomFeed, type ParsedAtomEntry } from '@/lib/atom'
import { isHardScienceArticle } from '@/lib/article-relevance'
import { appendConversationAnalytics } from '@/lib/conversation'
import type { ArticleLocale } from '@/lib/utils'
import type { Article } from '@/types'

export const CONVERSATION_FEEDS: {
  url: string
  locale: ArticleLocale
  tags: string[]
}[] = [
  {
    url: 'https://theconversation.com/topics/physics/articles.atom',
    locale: 'canada-english',
    tags: ['science', 'physics', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/quantum-physics/articles.atom',
    locale: 'canada-english',
    tags: ['science', 'physics', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/chemistry/articles.atom',
    locale: 'canada-english',
    tags: ['science', 'chemistry', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/astronomy/articles.atom',
    locale: 'canada-english',
    tags: ['science', 'astronomy', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/astrophysics/articles.atom',
    locale: 'canada-english',
    tags: ['science', 'astronomy', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/computer-science/articles.atom',
    locale: 'canada-english',
    tags: ['science', 'computer-science', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/mathematics/articles.atom',
    locale: 'canada-english',
    tags: ['science', 'mathematics', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/molecular-biology/articles.atom',
    locale: 'canada-english',
    tags: ['science', 'biology', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/materials-science/articles.atom',
    locale: 'canada-english',
    tags: ['science', 'materials-science', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/geology/articles.atom',
    locale: 'canada-english',
    tags: ['science', 'earth-science', 'canada-english', 'the-conversation'],
  },
  {
    // Filtered to hard science only — French edition has no dedicated topic feeds we can rely on
    url: 'https://theconversation.com/fr/technologie/articles.atom',
    locale: 'canada-french',
    tags: ['science', 'computer-science', 'canada-french', 'the-conversation'],
  },
]

const FEED_FETCH_GAP_MS = 400

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchConversationFeed(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Journality-Article-Importer/1.0',
      Accept: 'application/atom+xml, application/xml, text/xml',
    },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`)
  }

  return response.text()
}

export function entryToArticleRow(entry: ParsedAtomEntry, tags: string[]) {
  return {
    external_id: entry.externalId,
    title: entry.title,
    excerpt: entry.excerpt,
    body: appendConversationAnalytics(entry.body, entry.sourceUrl, entry.externalId),
    authors: entry.authors,
    source_name: 'The Conversation',
    source_url: entry.sourceUrl,
    cover_image_url: entry.coverImageUrl ?? null,
    field_tags: tags,
    published_at: entry.publishedAt ?? null,
  }
}

function filterHardScienceEntries(entries: ParsedAtomEntry[]): ParsedAtomEntry[] {
  return entries.filter((entry) => isHardScienceArticle(entry.title, entry.excerpt))
}

/** Drop Conversation rows that fail the hard-science gate (e.g. leftover lifestyle pieces). */
export async function purgeNonHardScienceArticles(): Promise<number> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, excerpt, source_name')
    .eq('source_name', 'The Conversation')

  if (error) throw error

  const rejectIds = ((data ?? []) as { id: string; title: string; excerpt: string | null }[])
    .filter((row) => !isHardScienceArticle(row.title, row.excerpt ?? ''))
    .map((row) => row.id)

  if (rejectIds.length === 0) return 0

  const { error: deleteError } = await supabase
    .from('articles')
    .delete()
    .in('id', rejectIds)

  if (deleteError) throw deleteError
  return rejectIds.length
}

export async function importConversationArticles() {
  const supabase = createServiceRoleClient()

  const results = {
    fetched: 0,
    kept: 0,
    skipped: 0,
    inserted: 0,
    updated: 0,
    failed: 0,
    purged: 0,
    errors: [] as string[],
    feeds: [] as {
      locale: ArticleLocale
      url: string
      fetched: number
      kept: number
      skipped: number
      inserted: number
      updated: number
      failed: number
    }[],
  }

  for (let i = 0; i < CONVERSATION_FEEDS.length; i++) {
    const feed = CONVERSATION_FEEDS[i]
    if (i > 0) await sleep(FEED_FETCH_GAP_MS)

    const xml = await fetchConversationFeed(feed.url)
    const entries = parseAtomFeed(xml)
    const keptEntries = filterHardScienceEntries(entries)
    const skipped = entries.length - keptEntries.length

    // Dedupe by external_id — Postgres rejects an upsert batch that hits the
    // same conflict target twice
    const rows = Array.from(
      new Map(
        keptEntries.map((entry) => [entry.externalId, entryToArticleRow(entry, feed.tags)])
      ).values()
    )
    const feedResult = {
      locale: feed.locale,
      url: feed.url,
      fetched: entries.length,
      kept: keptEntries.length,
      skipped,
      inserted: 0,
      updated: 0,
      failed: 0,
    }

    results.fetched += entries.length
    results.kept += keptEntries.length
    results.skipped += skipped

    if (rows.length > 0) {
      const { data: existingRows } = await supabase
        .from('articles')
        .select('external_id')
        .in('external_id', rows.map((row) => row.external_id))
      const existingIds = new Set(
        ((existingRows ?? []) as { external_id: string }[]).map((r) => r.external_id)
      )

      const { error } = await supabase
        .from('articles')
        .upsert(rows, { onConflict: 'external_id' })

      if (error) {
        results.failed += rows.length
        feedResult.failed += rows.length
        results.errors.push(`${feed.locale}: ${error.message}`)
      } else {
        for (const row of rows) {
          if (existingIds.has(row.external_id)) {
            results.updated += 1
            feedResult.updated += 1
          } else {
            results.inserted += 1
            feedResult.inserted += 1
          }
        }
      }
    }

    results.feeds.push(feedResult)
  }

  results.purged = await purgeNonHardScienceArticles()
  return results
}

// The upsert bumps updated_at on every imported row, so max(updated_at)
// doubles as the last-import timestamp — no extra bookkeeping table needed.
const ARTICLES_REFRESH_TTL_MS = 30 * 60 * 1000

let refreshInFlight: Promise<void> | null = null

/**
 * Kick off a Conversation feed refresh in the background.
 * Never await this on a request path — a full import can take 30s+.
 * Always purges non-hard-science leftovers, even when feeds are still fresh.
 */
export function scheduleConversationArticlesRefresh(): void {
  if (refreshInFlight) return

  refreshInFlight = (async () => {
    try {
      // Scrub lifestyle/political leftovers left from older importers
      await purgeNonHardScienceArticles()

      const supabase = createServiceRoleClient()
      const { data } = await supabase
        .from('articles')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const lastImportedAt = data?.updated_at ? new Date(data.updated_at).getTime() : 0
      if (Date.now() - lastImportedAt < ARTICLES_REFRESH_TTL_MS) return

      await importConversationArticles()
    } catch (error) {
      console.error('[articles] feed refresh failed:', error)
    } finally {
      refreshInFlight = null
    }
  })()
}

/** @deprecated Prefer scheduleConversationArticlesRefresh() — this still awaits the full import. */
export function refreshConversationArticlesIfStale(): Promise<void> {
  scheduleConversationArticlesRefresh()
  return refreshInFlight ?? Promise.resolve()
}

export async function listArticles(
  locale: ArticleLocale,
  limit = 12
): Promise<Article[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .contains('field_tags', [locale])
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as Article[]
}
