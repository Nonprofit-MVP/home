import { NextResponse } from 'next/server'

function decodeHtmlEntities(input: string) {
  if (!input) return input
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing arXiv ID' }, { status: 400 })

  try {
    const res = await fetch(`https://export.arxiv.org/abs/${encodeURIComponent(id)}`, {
      headers: { 'User-Agent': 'Journality-Research-Journal/1.0' },
    })

    if (!res.ok) throw new Error('arXiv request failed')
    const html = await res.text()

    // Extract title
    const titleMatch = html.match(/<h1 class="title mathjax"[^>]*>\s*<span[^>]*>Title:<\/span>\s*([\s\S]*?)<\/h1>/)
    const title = titleMatch
      ? decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim())
      : ''

    // Extract abstract
    const abstractMatch = html.match(/<blockquote class="abstract mathjax"[^>]*>\s*<span[^>]*>Abstract:<\/span>\s*([\s\S]*?)<\/blockquote>/)
    const abstract = abstractMatch
      ? decodeHtmlEntities(abstractMatch[1].replace(/<[^>]+>/g, '').trim())
      : ''

    // Extract authors
    const authorsMatch = html.match(/<div class="authors"[^>]*>([\s\S]*?)<\/div>/)
    const authorsHtml = authorsMatch ? authorsMatch[1] : ''
    const authorNames = authorsHtml.match(/title="[^"]*"[^>]*>([^<]+)<\/a>/g)?.map(a => {
      const match = a.match(/>([^<]+)<\/a>/)
      return match ? { name: decodeHtmlEntities(match[1].trim()), institution: '', email: '', orcid: '' } : null
    }).filter(Boolean) || []

    return NextResponse.json({ title, abstract, authors: authorNames })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch from arXiv' }, { status: 500 })
  }
}
