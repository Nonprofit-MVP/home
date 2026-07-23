export function extractConversationArticleId(
  sourceUrl: string,
  externalId?: string
): string | null {
  const fromUrl = sourceUrl.match(/-(\d+)\/?(?:\?|#|$)/)?.[1]
  if (fromUrl) return fromUrl

  const fromExternal = externalId?.match(/article\/(\d+)/)?.[1]
  return fromExternal ?? null
}

export function conversationAnalyticsPixel(articleId: string): string {
  return `<img src="https://counter.theconversation.com/content/${articleId}/count.gif?distributor=republish-lightbox-advanced" alt="The Conversation" width="1" height="1" style="border: none !important; box-shadow: none !important; margin: 0 !important; max-height: 1px !important; max-width: 1px !important; min-height: 1px !important; min-width: 1px !important; opacity: 0 !important; outline: none !important; padding: 0 !important" referrerpolicy="no-referrer-when-downgrade" />`
}

export function appendConversationAnalytics(
  body: string,
  sourceUrl: string,
  externalId?: string
): string {
  const articleId = extractConversationArticleId(sourceUrl, externalId)
  if (!articleId) return body

  const cleaned = body
    .replace(/<img[^>]*counter\.theconversation\.com[^>]*>/gi, '')
    .trim()

  return `${cleaned}\n${conversationAnalyticsPixel(articleId)}`
}

/**
 * Article pages already render cover_image_url as a hero. Conversation HTML
 * usually opens with the same image in a <figure>, so strip that lead figure
 * (and any leftover matching <img>) to avoid a double cover.
 */
export function stripLeadingCoverImage(
  body: string,
  coverImageUrl?: string | null
): string {
  if (!body) return body

  let cleaned = body.replace(/^\s*<figure\b[^>]*>[\s\S]*?<\/figure>\s*/i, '')

  if (coverImageUrl) {
    const fileKey = coverImageUrl.match(/\/([^/?#]+\.(?:jpe?g|png|gif|webp))/i)?.[1]
    if (fileKey) {
      const escaped = fileKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      cleaned = cleaned
        .replace(new RegExp(`<figure\\b[^>]*>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/figure>`, 'i'), '')
        .replace(new RegExp(`<img\\b[^>]*src=["'][^"']*${escaped}[^"']*["'][^>]*>`, 'i'), '')
    }
  }

  return cleaned.trim()
}
