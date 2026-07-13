import { fetchJSON, buildQuery, requireParam, contactEmail, envKey } from '../http'
import type { IntegrationManifest } from './types'

const BASE = 'https://api.openalex.org'
const SOURCE = 'OpenAlex'

// OpenAlex began requiring a (free) API key on 2026-02-13 — unauthenticated
// callers get a small grace-credit pool and then 409s, and anonymous *search*
// is aggressively rate-limited (503) under load. Send the key when present;
// always send mailto for the polite pool.
function withMailto(params: Record<string, unknown>) {
  const key = envKey('OPENALEX_API_KEY')
  return { ...params, mailto: contactEmail(), ...(key ? { api_key: key } : {}) }
}

async function searchWorks({ query, filter, page = 1, perPage = 25, sort }: Record<string, any> = {}) {
  requireParam({ query }, 'query', 'openalex.searchWorks')
  const qs = buildQuery(withMailto({ search: query, filter, page, 'per-page': perPage, sort }))
  return fetchJSON(`${BASE}/works${qs}`, { source: SOURCE })
}

async function getWork({ id }: Record<string, any> = {}) {
  requireParam({ id }, 'id', 'openalex.getWork')
  const qs = buildQuery(withMailto({}))
  return fetchJSON(`${BASE}/works/${encodeURIComponent(id)}${qs}`, { source: SOURCE })
}

async function searchAuthors({ query, page = 1, perPage = 25 }: Record<string, any> = {}) {
  requireParam({ query }, 'query', 'openalex.searchAuthors')
  const qs = buildQuery(withMailto({ search: query, page, 'per-page': perPage }))
  return fetchJSON(`${BASE}/authors${qs}`, { source: SOURCE })
}

async function getAuthor({ id }: Record<string, any> = {}) {
  requireParam({ id }, 'id', 'openalex.getAuthor')
  const qs = buildQuery(withMailto({}))
  return fetchJSON(`${BASE}/authors/${encodeURIComponent(id)}${qs}`, { source: SOURCE })
}

async function getWorksByAuthor({ authorId, page = 1, perPage = 25 }: Record<string, any> = {}) {
  requireParam({ authorId }, 'authorId', 'openalex.getWorksByAuthor')
  const qs = buildQuery(withMailto({ filter: `authorships.author.id:${authorId}`, page, 'per-page': perPage }))
  return fetchJSON(`${BASE}/works${qs}`, { source: SOURCE })
}

export const manifest: IntegrationManifest = {
  key: 'openalex',
  label: 'OpenAlex',
  description:
    'Catalog of scholarly works, authors, institutions, and concepts (openalex.org). Set the free OPENALEX_API_KEY env var — OpenAlex requires a key as of Feb 2026 (unauthenticated calls get limited grace credits then fail, and anonymous search is rate-limited).',
  docsUrl: 'https://docs.openalex.org',
  actions: {
    searchWorks: {
      description: 'Full-text search over scholarly works (papers).',
      params: {
        query: 'string, required',
        filter: "string, optional OpenAlex filter expression e.g. 'publication_year:2020'",
        page: 'number, optional (default 1)',
        perPage: 'number, optional (default 25, max 200)',
        sort: "string, optional e.g. 'cited_by_count:desc'",
      },
    },
    getWork: { description: 'Get a single work by OpenAlex ID, DOI, or DOI URL.', params: { id: 'string, required' } },
    searchAuthors: { description: 'Search authors by name.', params: { query: 'string, required', page: 'number, optional', perPage: 'number, optional' } },
    getAuthor: { description: 'Get a single author by OpenAlex ID or ORCID.', params: { id: 'string, required' } },
    getWorksByAuthor: { description: 'List works written by a given author ID.', params: { authorId: 'string, required OpenAlex author ID', page: 'number, optional', perPage: 'number, optional' } },
  },
}

export const actions = { searchWorks, getWork, searchAuthors, getAuthor, getWorksByAuthor }

export default { manifest, actions }
