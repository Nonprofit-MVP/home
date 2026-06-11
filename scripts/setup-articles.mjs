import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

dotenv.config({ path: path.join(root, '.env') })
dotenv.config({ path: path.join(root, '.env.local') })

const { Client } = pg
const CONVERSATION_FEEDS = [
  {
    url: 'https://theconversation.com/ca/technology/articles.atom',
    tags: ['science', 'technology', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/fr/technologie/articles.atom',
    tags: ['science', 'technology', 'canada-french', 'the-conversation'],
  },
]

function getDatabaseUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  const password = process.env.SUPABASE_DB_PASSWORD
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1]

  if (password && projectRef) {
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`
  }

  return null
}

async function runMigration() {
  const databaseUrl = getDatabaseUrl()
  if (!databaseUrl) {
    throw new Error(
      'Missing database connection. Set SUPABASE_DB_URL, DATABASE_URL, or SUPABASE_DB_PASSWORD in .env'
    )
  }

  const sqlPath = path.join(root, 'supabase/migrations/20260610000000_articles.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } })

  await client.connect()
  try {
    await client.query(sql)
    console.log('Migration applied: articles table ready')
  } finally {
    await client.end()
  }
}

function decode(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extract(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function stripHtml(html) {
  return decode(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function parseAtomFeed(xml) {
  const blocks = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? []

  return blocks
    .map((block) => {
      const externalId = extract(block, 'id')
      const title = decode(extract(block, 'title'))
      const rawBody = extract(block, 'content')
      const summary = extract(block, 'summary')
      const publishedAt = extract(block, 'published') || extract(block, 'updated')
      const sourceUrl =
        block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1]
        ?? block.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["']/i)?.[1]
        ?? ''

      const body = decode(rawBody)
        .replace(/<img[^>]*counter\.theconversation\.com[^>]*>/gi, '')
        .replace(/<p class="fine-print">[\s\S]*?<\/p>/gi, '')
        .trim()

      const authors = (block.match(/<author>[\s\S]*?<\/author>/gi) ?? []).map((authorBlock) => {
        const rawName = extract(authorBlock, 'name')
        const [name, ...rest] = rawName.split(',').map((part) => part.trim())
        return { name: decode(name), institution: decode(rest.join(', ')), email: '' }
      })

      const coverImageUrl = body.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
      const excerpt = stripHtml(summary) || stripHtml(body.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? body).slice(0, 220)

      if (!externalId || !title || !body || !sourceUrl) return null

      return {
        externalId,
        title,
        excerpt,
        body,
        authors,
        sourceUrl: decode(sourceUrl),
        coverImageUrl: coverImageUrl ? decode(coverImageUrl) : undefined,
        publishedAt: publishedAt || undefined,
      }
    })
    .filter(Boolean)
}

function extractConversationArticleId(sourceUrl, externalId) {
  const fromUrl = sourceUrl.match(/-(\d+)\/?(?:\?|#|$)/)?.[1]
  if (fromUrl) return fromUrl
  return externalId?.match(/article\/(\d+)/)?.[1] ?? null
}

function conversationAnalyticsPixel(articleId) {
  return `<img src="https://counter.theconversation.com/content/${articleId}/count.gif?distributor=republish-lightbox-advanced" alt="The Conversation" width="1" height="1" style="border: none !important; box-shadow: none !important; margin: 0 !important; max-height: 1px !important; max-width: 1px !important; min-height: 1px !important; min-width: 1px !important; opacity: 0 !important; outline: none !important; padding: 0 !important" referrerpolicy="no-referrer-when-downgrade" />`
}

function appendConversationAnalytics(body, sourceUrl, externalId) {
  const articleId = extractConversationArticleId(sourceUrl, externalId)
  if (!articleId) return body
  const cleaned = body.replace(/<img[^>]*counter\.theconversation\.com[^>]*>/gi, '').trim()
  return `${cleaned}\n${conversationAnalyticsPixel(articleId)}`
}

async function runImport() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let totalFetched = 0
  let totalInserted = 0
  let totalUpdated = 0
  let totalFailed = 0

  for (const feed of CONVERSATION_FEEDS) {
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent': 'Journality-Article-Importer/1.0',
        Accept: 'application/atom+xml, application/xml, text/xml',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch feed ${feed.url}: ${response.status}`)
    }

    const entries = parseAtomFeed(await response.text())
    let inserted = 0
    let updated = 0
    let failed = 0

    for (const entry of entries) {
      const row = {
        external_id: entry.externalId,
        title: entry.title,
        excerpt: entry.excerpt,
        body: appendConversationAnalytics(entry.body, entry.sourceUrl, entry.externalId),
        authors: entry.authors,
        source_name: 'The Conversation',
        source_url: entry.sourceUrl,
        cover_image_url: entry.coverImageUrl ?? null,
        field_tags: feed.tags,
        published_at: entry.publishedAt ?? null,
      }

      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('external_id', row.external_id)
        .maybeSingle()

      const { error } = await supabase.from('articles').upsert(row, { onConflict: 'external_id' })
      if (error) {
        failed += 1
        console.error(`Failed: ${entry.title} — ${error.message}`)
        continue
      }

      if (existing) updated += 1
      else inserted += 1
    }

    totalFetched += entries.length
    totalInserted += inserted
    totalUpdated += updated
    totalFailed += failed

    console.log(`Imported ${feed.url}:`, { fetched: entries.length, inserted, updated, failed })
  }

  console.log('Import complete:', {
    fetched: totalFetched,
    inserted: totalInserted,
    updated: totalUpdated,
    failed: totalFailed,
  })
}

async function main() {
  const mode = process.argv[2] || 'all'

  if (mode === 'migrate' || mode === 'all') {
    await runMigration()
  }

  if (mode === 'import' || mode === 'all') {
    await runImport()
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
