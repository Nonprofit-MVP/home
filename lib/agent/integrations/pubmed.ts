import { fetchJSON, fetchText, buildQuery, requireParam, contactEmail, envKey } from '../http'
import type { IntegrationManifest } from './types'

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const SOURCE = 'PubMed E-utilities'

function withCreds(params: Record<string, unknown>) {
  const key = envKey('NCBI_API_KEY')
  return { ...params, tool: 'Journality', email: contactEmail(), ...(key ? { api_key: key } : {}) }
}

async function search({ term, db = 'pubmed', retmax = 20, sort }: Record<string, any> = {}) {
  requireParam({ term }, 'term', 'pubmed.search')
  const qs = buildQuery(withCreds({ db, term, retmax, sort, retmode: 'json' }))
  return fetchJSON(`${BASE}/esearch.fcgi${qs}`, { source: SOURCE })
}

async function summary({ ids, db = 'pubmed' }: Record<string, any> = {}) {
  requireParam({ ids }, 'ids', 'pubmed.summary')
  const idList = Array.isArray(ids) ? ids.join(',') : ids
  const qs = buildQuery(withCreds({ db, id: idList, retmode: 'json' }))
  return fetchJSON(`${BASE}/esummary.fcgi${qs}`, { source: SOURCE })
}

function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : null
}

async function fetchRecords({ ids, db = 'pubmed', rettype = 'abstract', retmode = 'xml' }: Record<string, any> = {}) {
  requireParam({ ids }, 'ids', 'pubmed.fetchRecords')
  const idList = Array.isArray(ids) ? ids.join(',') : ids
  const qs = buildQuery(withCreds({ db, id: idList, rettype, retmode }))
  const raw = await fetchText(`${BASE}/efetch.fcgi${qs}`, { source: SOURCE })
  if (retmode !== 'xml') return { raw }
  const articles = raw
    .split(/<PubmedArticle>/)
    .slice(1)
    .map(chunk => ({
      title: extractTag(chunk, 'ArticleTitle'),
      abstract: extractTag(chunk, 'AbstractText'),
      journal: extractTag(chunk, 'Title'),
      pubYear: extractTag(chunk, 'Year'),
    }))
  return { articles, raw: articles.length ? undefined : raw }
}

async function searchAndSummarize({ term, db = 'pubmed', retmax = 20 }: Record<string, any> = {}) {
  requireParam({ term }, 'term', 'pubmed.searchAndSummarize')
  const found = await search({ term, db, retmax })
  const ids = found?.esearchresult?.idlist || []
  if (!ids.length) return { count: found?.esearchresult?.count || '0', ids: [], results: [] }
  const summarized = await summary({ ids, db })
  const uids = summarized?.result?.uids || []
  return {
    count: found?.esearchresult?.count,
    ids,
    results: uids.map((uid: string) => summarized.result[uid]),
  }
}

export const manifest: IntegrationManifest = {
  key: 'pubmed',
  label: 'PubMed E-utilities',
  description:
    'NCBI Entrez search/summary/fetch over PubMed and other Entrez databases. No API key required (optional NCBI_API_KEY env var raises the rate limit from 3/s to 10/s).',
  docsUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK25501/',
  actions: {
    search: { description: 'esearch — find record IDs matching a term.', params: { term: 'string, required Entrez query', db: "string, optional (default 'pubmed')", retmax: 'number, optional (default 20)', sort: 'string, optional' } },
    summary: { description: 'esummary — get document summaries for a list of IDs.', params: { ids: 'string or array of IDs, required', db: "string, optional (default 'pubmed')" } },
    fetchRecords: { description: 'efetch — get full records (title/abstract) for a list of IDs.', params: { ids: 'string or array of IDs, required', db: "string, optional (default 'pubmed')", rettype: "string, optional (default 'abstract')", retmode: "string, optional 'xml' or 'text' (default 'xml')" } },
    searchAndSummarize: { description: 'Convenience: esearch + esummary in one call.', params: { term: 'string, required', db: 'string, optional', retmax: 'number, optional' } },
  },
}

export const actions = { search, summary, fetchRecords, searchAndSummarize }

export default { manifest, actions }
