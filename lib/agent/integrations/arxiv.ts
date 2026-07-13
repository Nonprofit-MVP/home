import { fetchText, buildQuery, requireParam } from '../http'
import type { IntegrationManifest } from './types'

// HTTPS (not http://) to avoid a 301 redirect hop on every call. arXiv also
// rate-limits bursts (~1 req/3s) with a 429, so these reads opt into a single
// paced retry via http.ts's retry option.
const BASE = 'https://export.arxiv.org/api/query'
const SOURCE = 'arXiv'

// arXiv's export API only speaks Atom XML — there's no JSON mode and no
// general XML parser dependency in this project, so we pick the fixed set of
// tags this feed always emits with targeted regexes instead of pulling in a
// full parser for one endpoint.
function textOf(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m ? m[1].trim() : null
}

function parseEntries(xml: string) {
  const entries = xml
    .split(/<entry>/)
    .slice(1)
    .map(chunk => {
      const authors: (string | null)[] = []
      const authorRe = /<author>([\s\S]*?)<\/author>/gi
      let am: RegExpExecArray | null
      while ((am = authorRe.exec(chunk))) authors.push(textOf(am[1], 'name'))

      const links: { href: string; rel?: string; title?: string }[] = []
      const linkRe = /<link\s+([^>]*)\/?>/gi
      let lm: RegExpExecArray | null
      while ((lm = linkRe.exec(chunk))) {
        const attrs = lm[1]
        const href = (attrs.match(/href="([^"]+)"/) || [])[1]
        const rel = (attrs.match(/rel="([^"]+)"/) || [])[1]
        const title = (attrs.match(/title="([^"]+)"/) || [])[1]
        if (href) links.push({ href, rel, title })
      }

      const categories: string[] = []
      const catRe = /<category\s+([^>]*)\/?>/gi
      let cm: RegExpExecArray | null
      while ((cm = catRe.exec(chunk))) {
        const term = (cm[1].match(/term="([^"]+)"/) || [])[1]
        if (term) categories.push(term)
      }

      const idUrl = textOf(chunk, 'id')
      return {
        id: idUrl ? idUrl.replace(/^https?:\/\/arxiv\.org\/abs\//, '') : null,
        url: idUrl,
        title: textOf(chunk, 'title')?.replace(/\s+/g, ' '),
        summary: textOf(chunk, 'summary')?.replace(/\s+/g, ' '),
        published: textOf(chunk, 'published'),
        updated: textOf(chunk, 'updated'),
        authors: authors.filter(Boolean),
        categories,
        links,
        pdfUrl: links.find(l => l.title === 'pdf')?.href,
      }
    })
  return entries
}

async function search({ query, start = 0, maxResults = 10, sortBy, sortOrder }: Record<string, any> = {}) {
  requireParam({ query }, 'query', 'arxiv.search')
  const qs = buildQuery({ search_query: query, start, max_results: maxResults, sortBy, sortOrder })
  const xml = await fetchText(`${BASE}${qs}`, { source: SOURCE, retries: 1, retryBackoffMs: 3000 })
  return { totalResults: Number(textOf(xml, 'opensearch:totalResults')) || null, entries: parseEntries(xml) }
}

async function getById({ id }: Record<string, any> = {}) {
  requireParam({ id }, 'id', 'arxiv.getById')
  const idList = Array.isArray(id) ? id.join(',') : id
  const qs = buildQuery({ id_list: idList })
  const xml = await fetchText(`${BASE}${qs}`, { source: SOURCE, retries: 1, retryBackoffMs: 3000 })
  return { entries: parseEntries(xml) }
}

export const manifest: IntegrationManifest = {
  key: 'arxiv',
  label: 'arXiv',
  description: 'Preprint search and metadata lookup (arxiv.org). No API key required.',
  docsUrl: 'https://info.arxiv.org/help/api/user-manual.html',
  actions: {
    search: {
      description: "Search preprints, e.g. query 'all:transformer attention' or 'cat:cs.LG'.",
      params: {
        query: 'string, required arXiv query syntax',
        start: 'number, optional (default 0)',
        maxResults: 'number, optional (default 10)',
        sortBy: "string, optional 'relevance'|'lastUpdatedDate'|'submittedDate'",
        sortOrder: "string, optional 'ascending'|'descending'",
      },
    },
    getById: { description: "Get one or more preprints by arXiv ID (e.g. '2301.00001').", params: { id: 'string or array of arXiv IDs, required' } },
  },
}

export const actions = { search, getById }

export default { manifest, actions }
