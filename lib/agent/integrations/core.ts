import { fetchJSON, buildQuery, requireParam, UpstreamError, envKey } from '../http'
import type { IntegrationManifest } from './types'

const BASE = 'https://api.core.ac.uk/v3'
const SOURCE = 'CORE'

function authHeaders(): Record<string, string> {
  const key = envKey('CORE_API_KEY')
  if (!key) {
    throw new UpstreamError(
      'CORE requires a free API key. Set the CORE_API_KEY environment variable (sign up at core.ac.uk/services/api).',
      { status: 401, source: SOURCE }
    )
  }
  return { Authorization: `Bearer ${key}` }
}

async function searchWorks({ query, limit = 20, offset = 0 }: Record<string, any> = {}) {
  requireParam({ query }, 'query', 'core.searchWorks')
  const qs = buildQuery({ q: query, limit, offset })
  return fetchJSON(`${BASE}/search/works${qs}`, { source: SOURCE, headers: authHeaders() })
}

async function getWork({ id }: Record<string, any> = {}) {
  requireParam({ id }, 'id', 'core.getWork')
  return fetchJSON(`${BASE}/works/${encodeURIComponent(id)}`, { source: SOURCE, headers: authHeaders() })
}

async function searchDataProviders({ query, limit = 20, offset = 0 }: Record<string, any> = {}) {
  requireParam({ query }, 'query', 'core.searchDataProviders')
  const qs = buildQuery({ q: query, limit, offset })
  return fetchJSON(`${BASE}/search/data-providers${qs}`, { source: SOURCE, headers: authHeaders() })
}

export const manifest: IntegrationManifest = {
  key: 'core',
  label: 'CORE',
  description:
    'Aggregator of open-access research papers harvested from repositories worldwide (core.ac.uk). Requires a free CORE_API_KEY environment variable.',
  docsUrl: 'https://api.core.ac.uk/docs/v3',
  actions: {
    searchWorks: {
      description: 'Full-text search over open-access works.',
      params: { query: "string, required (supports CORE query syntax, e.g. 'title:climate AND yearPublished:2022')", limit: 'number, optional (max 100)', offset: 'number, optional' },
    },
    getWork: { description: 'Get a single work by CORE ID.', params: { id: 'string, required' } },
    searchDataProviders: { description: 'Search the repositories/data providers CORE harvests from.', params: { query: 'string, required', limit: 'number, optional', offset: 'number, optional' } },
  },
}

export const actions = { searchWorks, getWork, searchDataProviders }

export default { manifest, actions }
