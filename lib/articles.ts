import { createServiceRoleClient } from '@/lib/supabase'
import { parseAtomFeed, type ParsedAtomEntry } from '@/lib/atom'
import { appendConversationAnalytics } from '@/lib/conversation'
import type { ArticleLocale } from '@/lib/utils'
import type { Article } from '@/types'

export const CONVERSATION_FEEDS: {
  url: string
  locale: ArticleLocale
  tags: string[]
}[] = [
  {
    url: 'https://theconversation.com/ca/technology/articles.atom',
    locale: 'canada-english',
    tags: ['science', 'technology', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/fr/technologie/articles.atom',
    locale: 'canada-french',
    tags: ['science', 'technology', 'canada-french', 'the-conversation'],
  },
]

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

export async function importConversationArticles() {
  const supabase = createServiceRoleClient()

  const results = {
    fetched: 0,
    inserted: 0,
    updated: 0,
    failed: 0,
    errors: [] as string[],
    feeds: [] as { locale: ArticleLocale; fetched: number; inserted: number; updated: number; failed: number }[],
  }

  for (const feed of CONVERSATION_FEEDS) {
    const xml = await fetchConversationFeed(feed.url)
    const entries = parseAtomFeed(xml)
    const feedResult = {
      locale: feed.locale,
      fetched: entries.length,
      inserted: 0,
      updated: 0,
      failed: 0,
    }

    results.fetched += entries.length

    for (const entry of entries) {
      const row = entryToArticleRow(entry, feed.tags)
      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('external_id', row.external_id)
        .maybeSingle()

      const { error } = await supabase
        .from('articles')
        .upsert(row, { onConflict: 'external_id' })

      if (error) {
        results.failed += 1
        feedResult.failed += 1
        results.errors.push(`${entry.title}: ${error.message}`)
        continue
      }

      if (existing) {
        results.updated += 1
        feedResult.updated += 1
      } else {
        results.inserted += 1
        feedResult.inserted += 1
      }
    }

    results.feeds.push(feedResult)
  }

  return results
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
