import { fetchJSON, buildQuery, requireParam, UpstreamError, envKey } from '../http'
import type { IntegrationManifest } from './types'
import * as crossref from './crossref'

const BASE = 'https://api.semanticscholar.org/graph/v1'
const SOURCE = 'Semantic Scholar'
const DEFAULT_PAPER_FIELDS =
  'title,abstract,year,venue,authors,externalIds,url,citationCount,referenceCount,openAccessPdf'
const DEFAULT_AUTHOR_FIELDS = 'name,affiliations,homepage,paperCount,citationCount,hIndex'

function authHeaders(): Record<string, string> {
  const key = envKey('SEMANTIC_SCHOLAR_API_KEY')
  return key ? { 'x-api-key': key } : {}
}

// Map Crossref work items to the minimal paper shape used as a Semantic Scholar
// fallback, so a rate-limited anonymous S2 search still yields usable results.
function crossrefToPapers(cr: any) {
  const items = (cr && cr.message && cr.message.items) || []
  return items.map((it: any) => ({
    title: Array.isArray(it.title) ? it.title[0] : it.title,
    year: it.issued && it.issued['date-parts'] ? it.issued['date-parts'][0][0] : null,
    doi: it.DOI,
    url: it.URL,
    venue: Array.isArray(it['container-title']) ? it['container-title'][0] : it['container-title'],
    authors: (it.author || [])
      .map((a: any) => [a.given, a.family].filter(Boolean).join(' '))
      .filter(Boolean),
    citationCount: it['is-referenced-by-count'] != null ? it['is-referenced-by-count'] : null,
    abstract: it.abstract || null,
  }))
}

async function searchPapers({ query, fields = DEFAULT_PAPER_FIELDS, limit = 10, offset = 0, year }: Record<string, any> = {}) {
  requireParam({ query }, 'query', 'semanticScholar.searchPapers')
  const qs = buildQuery({ query, fields, limit, offset, year })
  try {
    return await fetchJSON(`${BASE}/paper/search${qs}`, { source: SOURCE, headers: authHeaders() })
  } catch (err) {
    // Semantic Scholar's anonymous pool is aggressively rate-limited (429). With
    // no key configured, fall back to Crossref (keyless, reliable) so the caller
    // still gets papers — tagged via _fallback so it isn't mistaken for S2 data.
    const transient = err instanceof UpstreamError && [429, 502, 503, 504].includes(err.status)
    if (transient && !envKey('SEMANTIC_SCHOLAR_API_KEY')) {
      const cr = await crossref.actions.searchWorks({ query, rows: limit })
      return {
        _fallback: {
          source: 'crossref',
          reason: `Semantic Scholar responded ${(err as UpstreamError).status} (no SEMANTIC_SCHOLAR_API_KEY set); results are from Crossref instead.`,
        },
        total: (cr && cr.message && cr.message['total-results']) || null,
        data: crossrefToPapers(cr),
      }
    }
    throw err
  }
}

async function getPaper({ paperId, fields = DEFAULT_PAPER_FIELDS }: Record<string, any> = {}) {
  requireParam({ paperId }, 'paperId', 'semanticScholar.getPaper')
  const qs = buildQuery({ fields })
  return fetchJSON(`${BASE}/paper/${encodeURIComponent(paperId)}${qs}`, { source: SOURCE, headers: authHeaders() })
}

async function getPaperCitations({ paperId, fields = DEFAULT_PAPER_FIELDS, limit = 25, offset = 0 }: Record<string, any> = {}) {
  requireParam({ paperId }, 'paperId', 'semanticScholar.getPaperCitations')
  const qs = buildQuery({ fields, limit, offset })
  return fetchJSON(`${BASE}/paper/${encodeURIComponent(paperId)}/citations${qs}`, { source: SOURCE, headers: authHeaders() })
}

async function getPaperReferences({ paperId, fields = DEFAULT_PAPER_FIELDS, limit = 25, offset = 0 }: Record<string, any> = {}) {
  requireParam({ paperId }, 'paperId', 'semanticScholar.getPaperReferences')
  const qs = buildQuery({ fields, limit, offset })
  return fetchJSON(`${BASE}/paper/${encodeURIComponent(paperId)}/references${qs}`, { source: SOURCE, headers: authHeaders() })
}

async function searchAuthors({ query, fields = DEFAULT_AUTHOR_FIELDS, limit = 10, offset = 0 }: Record<string, any> = {}) {
  requireParam({ query }, 'query', 'semanticScholar.searchAuthors')
  const qs = buildQuery({ query, fields, limit, offset })
  return fetchJSON(`${BASE}/author/search${qs}`, { source: SOURCE, headers: authHeaders() })
}

async function getAuthor({ authorId, fields = DEFAULT_AUTHOR_FIELDS }: Record<string, any> = {}) {
  requireParam({ authorId }, 'authorId', 'semanticScholar.getAuthor')
  const qs = buildQuery({ fields })
  return fetchJSON(`${BASE}/author/${encodeURIComponent(authorId)}${qs}`, { source: SOURCE, headers: authHeaders() })
}

export const manifest: IntegrationManifest = {
  key: 'semanticScholar',
  label: 'Semantic Scholar',
  description:
    'Academic paper search, citation graph, and author lookup (semanticscholar.org). The anonymous pool is heavily rate-limited (429); set the free SEMANTIC_SCHOLAR_API_KEY env var for reliable use. Without a key, searchPapers falls back to Crossref on a rate-limit.',
  docsUrl: 'https://api.semanticscholar.org/api-docs/graph',
  actions: {
    searchPapers: {
      description: 'Keyword search over papers.',
      params: { query: 'string, required', fields: 'string, optional comma-separated fields', limit: 'number, optional (max 100)', offset: 'number, optional', year: "string, optional e.g. '2019-2023'" },
    },
    getPaper: {
      description: "Get a paper by Semantic Scholar ID, DOI, arXiv ID (prefixed 'arXiv:'), or other supported external ID.",
      params: { paperId: 'string, required', fields: 'string, optional' },
    },
    getPaperCitations: { description: 'List papers that cite the given paper.', params: { paperId: 'string, required', fields: 'string, optional', limit: 'number, optional', offset: 'number, optional' } },
    getPaperReferences: { description: 'List papers referenced by the given paper.', params: { paperId: 'string, required', fields: 'string, optional', limit: 'number, optional', offset: 'number, optional' } },
    searchAuthors: { description: 'Search authors by name.', params: { query: 'string, required', fields: 'string, optional', limit: 'number, optional', offset: 'number, optional' } },
    getAuthor: { description: 'Get an author by Semantic Scholar author ID.', params: { authorId: 'string, required', fields: 'string, optional' } },
  },
}

export const actions = { searchPapers, getPaper, getPaperCitations, getPaperReferences, searchAuthors, getAuthor }

export default { manifest, actions }
