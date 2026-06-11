import type { Author } from '@/types'

export interface ParsedAtomEntry {
  externalId: string
  title: string
  excerpt: string
  body: string
  authors: Author[]
  sourceUrl: string
  coverImageUrl?: string
  publishedAt?: string
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function extractLinkHref(block: string): string {
  const match = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)
    ?? block.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["']/i)
  return match?.[1]?.trim() ?? ''
}

function extractAuthors(block: string): Author[] {
  const authors: Author[] = []
  const authorBlocks = block.match(/<author>[\s\S]*?<\/author>/gi) ?? []

  for (const authorBlock of authorBlocks) {
    const rawName = extractTag(authorBlock, 'name')
    if (!rawName) continue

    const [name, ...rest] = rawName.split(',').map(part => part.trim())
    const institution = rest.join(', ').trim()

    authors.push({
      name: decodeHtmlEntities(name),
      institution: decodeHtmlEntities(institution),
      email: '',
    })
  }

  return authors
}

function extractCoverImage(html: string): string | undefined {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1] ? decodeHtmlEntities(match[1]) : undefined
}

function cleanArticleBody(html: string): string {
  return decodeHtmlEntities(html)
    .replace(/<img[^>]*counter\.theconversation\.com[^>]*>/gi, '')
    .replace(/<p class="fine-print">[\s\S]*?<\/p>/gi, '')
    .trim()
}

function buildExcerpt(summary: string, body: string): string {
  const cleanedSummary = stripHtml(summary)
  if (cleanedSummary) return cleanedSummary

  const firstParagraph = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? body
  const text = stripHtml(firstParagraph)
  if (text.length <= 220) return text
  return `${text.slice(0, 217).trim()}...`
}

export function parseAtomFeed(xml: string): ParsedAtomEntry[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? []

  return entries
    .map((block) => {
      const externalId = extractTag(block, 'id')
      const title = decodeHtmlEntities(extractTag(block, 'title'))
      const rawBody = extractTag(block, 'content')
      const summary = extractTag(block, 'summary')
      const sourceUrl = extractLinkHref(block)
      const publishedAt = extractTag(block, 'published') || extractTag(block, 'updated')
      const body = cleanArticleBody(rawBody)

      if (!externalId || !title || !body || !sourceUrl) return null

      return {
        externalId,
        title,
        excerpt: buildExcerpt(summary, body),
        body,
        authors: extractAuthors(block),
        sourceUrl,
        coverImageUrl: extractCoverImage(body),
        publishedAt: publishedAt || undefined,
      }
    })
    .filter((entry): entry is ParsedAtomEntry => entry !== null)
}
