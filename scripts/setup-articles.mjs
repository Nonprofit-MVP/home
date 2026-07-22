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
    url: 'https://theconversation.com/topics/physics/articles.atom',
    tags: ['science', 'physics', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/quantum-physics/articles.atom',
    tags: ['science', 'physics', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/chemistry/articles.atom',
    tags: ['science', 'chemistry', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/astronomy/articles.atom',
    tags: ['science', 'astronomy', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/astrophysics/articles.atom',
    tags: ['science', 'astronomy', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/computer-science/articles.atom',
    tags: ['science', 'computer-science', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/mathematics/articles.atom',
    tags: ['science', 'mathematics', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/molecular-biology/articles.atom',
    tags: ['science', 'biology', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/materials-science/articles.atom',
    tags: ['science', 'materials-science', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/topics/geology/articles.atom',
    tags: ['science', 'earth-science', 'canada-english', 'the-conversation'],
  },
  {
    url: 'https://theconversation.com/fr/technologie/articles.atom',
    tags: ['science', 'computer-science', 'canada-french', 'the-conversation'],
  },
]

const BLOCK_PATTERNS = [
  /\b(boyfriend|girlfriend|dating|flirt|romance|romantic|cheating|lonely|loneliness)\b/i,
  /\bai (boyfriend|girlfriend|companion|partner|lover)\b/i,
  /\b(replika|character\.ai|nomi ai)\b/i,
  /\b(why do (i|my)|baby brain|too pretty|vivid dreams)\b/i,
  /\b(holiday traffic|lotto|world cup|football|tennis player's brain)\b/i,
  /\b(poetry|oscars?|mainstream films|gentrification)\b/i,
  /\b(people skills|hiring decisions|classroom)\b/i,
  /\b(choosing your senior|stream['']? school students)\b/i,
  /\bfingers go wrinkly\b/i,
  /\b(writerly|everyday skill|moral questions|for all of humanity)\b/i,
  /\b(butter or margarine|baked goods)\b/i,
  /\b(ai prompting|prompting turned)\b/i,
  /\b(trump|harris|election|campaign|parliament|congress|senator|legislation)\b/i,
  /\b(geopolitic|foreign policy|government is controlling)\b/i,
  /\b(ai safety['']? priorities|policing ai in the classroom)\b/i,
  /\b(digital transformation could be a blueprint)\b/i,
  /\bi created an\b/i,
  /\bif you flirt\b/i,
  /\b(vacances|penalty|gardiens|mandalorian|respiration nous permet)\b/i,
  /\b(pompiers au piège|feintes|organiser nos)\b/i,
  /\bà quoi servent les grosses boules\b/i,
  /\b(qu[''\u2019]en dit le droit|ni écologiques, ni économes)\b/i,
]

const HARD_SCIENCE_SIGNALS = [
  /\b(quantum|physics|physicist|spacetime|relativity|neutrino|boson|fermion|photon|laser)\b/i,
  /\b(black hole|dark (matter|energy)|galaxy|galaxies|supernova|neutron star|pulsar)\b/i,
  /\b(telescope|astronom|astrophysic|cosmolog|exoplanet|solar (flare|system|wind)|orbit)\b/i,
  /\b(particle|hadron|collider|entanglement|superconduct|magnetism|gravity)\b/i,
  /\b(chemist|chemical|molecule|molecular|atom|atomic|periodic table|element)\b/i,
  /\b(nanoparticle|nanotech|nanomaterial|catalyst|polymer|crystal|semiconductor)\b/i,
  /\b(materials? science|graphene|alloy|isotope|reaction kinetics)\b/i,
  /\b(genome|genomic|dna|rna|protein|enzyme|cell(ular)?|microscop|cloning)\b/i,
  /\b(molecular biology|synthetic (life|biology)|immune cell|antibiotics?|pathogen)\b/i,
  /\b(evolution|natural selection|organism|species|ecology|fossils?)\b/i,
  /\b(geolog|tectonic|magma|mantle|crater|seismic|earthquake|mineral|sediment)\b/i,
  /\b(climate model|oceanograph|atmosphere|glaci|paleoclim|permafrost)\b/i,
  /\b(mathematic|theorem|conjecture|prime numbers?|jacobian|geometry|topology|algebra)\b/i,
  /\b(equation|proof|number theory|combinator|statistic(al)? model)\b/i,
  /\b(computer science|algorithm|computational|simulation|compiler|cryptograph)\b/i,
  /\b(machine learning|neural networks?|deep learning|large language models?|llms?)\b/i,
  /\b(quantum comput|software|data structure|distributed system|cybersecurity)\b/i,
  /\b(programming|informatics|artificial intelligence|reinforcement learning)\b/i,
  /\b(satellite collisions?|data centres?|data centers?)\b/i,
  /\b(engineering|aerospace|nanotechnology|sensor|optics|fiber optic)\b/i,
  /\b(spacecraft|rocket|propulsion|structural|bridge)\b/i,
  /\b(physique|quantique|astronom|astrophys|cosmolog|trou noir|matière noire|énergie sombre)\b/i,
  /\b(chim(ie|ique)|molécul|atome|périodique|nanotech|nanomatériau|catalyse)\b/i,
  /\b(génome|protéine|enzyme|cellule|microscop|évolution|fossile|bactéri)\b/i,
  /\b(géolog|tectonique|séisme|volcan|minéral|manteau|cratère|stratosphère)\b/i,
  /\b(mathémat|théorème|conjecture|algorithme|informatique|intelligence artificielle)\b/i,
  /\b(muon|comète|satellite|métaux précieux|synapses?|système nerveux|rayons? n)\b/i,
  /\b(constellations? de satellites|centres? de données|recycle(r)? les métaux)\b/i,
]

function isHardScienceArticle(title, excerpt = '') {
  const text = `${title}\n${excerpt}`.trim()
  if (!text) return false
  if (BLOCK_PATTERNS.some((pattern) => pattern.test(text))) return false
  return HARD_SCIENCE_SIGNALS.some((pattern) => pattern.test(text))
}

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function purgeNonHardScience(supabase) {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, excerpt')
    .eq('source_name', 'The Conversation')

  if (error) throw error

  const rejectIds = (data ?? [])
    .filter((row) => !isHardScienceArticle(row.title, row.excerpt ?? ''))
    .map((row) => row.id)

  if (rejectIds.length === 0) return 0

  const { error: deleteError } = await supabase.from('articles').delete().in('id', rejectIds)
  if (deleteError) throw deleteError
  return rejectIds.length
}

async function runImport() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let totalFetched = 0
  let totalKept = 0
  let totalSkipped = 0
  let totalInserted = 0
  let totalUpdated = 0
  let totalFailed = 0

  for (let i = 0; i < CONVERSATION_FEEDS.length; i++) {
    const feed = CONVERSATION_FEEDS[i]
    if (i > 0) await sleep(400)

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
    const kept = entries.filter((entry) => isHardScienceArticle(entry.title, entry.excerpt))
    const skipped = entries.length - kept.length
    let inserted = 0
    let updated = 0
    let failed = 0

    for (const entry of kept) {
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
    totalKept += kept.length
    totalSkipped += skipped
    totalInserted += inserted
    totalUpdated += updated
    totalFailed += failed

    console.log(`Imported ${feed.url}:`, {
      fetched: entries.length,
      kept: kept.length,
      skipped,
      inserted,
      updated,
      failed,
    })
  }

  const purged = await purgeNonHardScience(supabase)

  console.log('Import complete:', {
    fetched: totalFetched,
    kept: totalKept,
    skipped: totalSkipped,
    inserted: totalInserted,
    updated: totalUpdated,
    failed: totalFailed,
    purged,
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
