import { fetchJSON, buildQuery, requireParam, contactEmail } from '../http'
import type { IntegrationManifest } from './types'

const BASE = 'https://api.crossref.org'
const SOURCE = 'Crossref'

function withMailto(params: Record<string, unknown>) {
  return { ...params, mailto: contactEmail() }
}

async function searchWorks({ query, filter, rows = 20, offset = 0, sort }: Record<string, any> = {}) {
  requireParam({ query }, 'query', 'crossref.searchWorks')
  const qs = buildQuery(withMailto({ 'query.bibliographic': query, filter, rows, offset, sort }))
  return fetchJSON(`${BASE}/works${qs}`, { source: SOURCE })
}

async function getWork({ doi }: Record<string, any> = {}) {
  requireParam({ doi }, 'doi', 'crossref.getWork')
  const qs = buildQuery(withMailto({}))
  return fetchJSON(`${BASE}/works/${encodeURIComponent(doi)}${qs}`, { source: SOURCE })
}

async function searchJournals({ query, rows = 20, offset = 0 }: Record<string, any> = {}) {
  requireParam({ query }, 'query', 'crossref.searchJournals')
  const qs = buildQuery(withMailto({ query, rows, offset }))
  return fetchJSON(`${BASE}/journals${qs}`, { source: SOURCE })
}

async function getJournal({ issn }: Record<string, any> = {}) {
  requireParam({ issn }, 'issn', 'crossref.getJournal')
  const qs = buildQuery(withMailto({}))
  return fetchJSON(`${BASE}/journals/${encodeURIComponent(issn)}${qs}`, { source: SOURCE })
}

async function getWorksByFunder({ funderId, rows = 20, offset = 0 }: Record<string, any> = {}) {
  requireParam({ funderId }, 'funderId', 'crossref.getWorksByFunder')
  // Query the main works index with a funder filter rather than the
  // /funders/{id}/works sub-resource: the sub-resource is ~2x slower and 500s
  // outright for some large funders. This route can take 5-14s.
  const qs = buildQuery(withMailto({ filter: `funder:${funderId}`, rows, offset }))
  return fetchJSON(`${BASE}/works${qs}`, { source: SOURCE, timeoutMs: 20000 })
}

export const manifest: IntegrationManifest = {
  key: 'crossref',
  label: 'Crossref',
  description: 'DOI registration metadata for scholarly works and journals (crossref.org). No API key required.',
  docsUrl: 'https://api.crossref.org/swagger-ui/index.html',
  actions: {
    searchWorks: {
      description: 'Bibliographic search over registered works.',
      params: {
        query: 'string, required',
        filter: "string, optional Crossref filter e.g. 'from-pub-date:2020-01-01'",
        rows: 'number, optional (max 1000)',
        offset: 'number, optional',
        sort: "string, optional e.g. 'relevance'",
      },
    },
    getWork: { description: 'Get a single work by DOI.', params: { doi: 'string, required' } },
    searchJournals: { description: 'Search journals by name.', params: { query: 'string, required', rows: 'number, optional', offset: 'number, optional' } },
    getJournal: { description: 'Get a journal by ISSN.', params: { issn: 'string, required' } },
    getWorksByFunder: { description: 'List works acknowledging a given funder ID.', params: { funderId: 'string, required Crossref funder ID', rows: 'number, optional', offset: 'number, optional' } },
  },
}

export const actions = { searchWorks, getWork, searchJournals, getJournal, getWorksByFunder }

export default { manifest, actions }
