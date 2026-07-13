import { fetchJSON, buildQuery, requireParam } from '../http'
import type { IntegrationManifest } from './types'

const BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest'
const SOURCE = 'Europe PMC'

async function search({ query, pageSize = 25, cursorMark = '*' }: Record<string, any> = {}) {
  requireParam({ query }, 'query', 'europepmc.search')
  const qs = buildQuery({ query, format: 'json', pageSize, cursorMark })
  return fetchJSON(`${BASE}/search${qs}`, { source: SOURCE })
}

async function getById({ source = 'MED', id }: Record<string, any> = {}) {
  requireParam({ id }, 'id', 'europepmc.getById')
  const qs = buildQuery({ query: `EXT_ID:${id} AND SRC:${source}`, format: 'json' })
  return fetchJSON(`${BASE}/search${qs}`, { source: SOURCE })
}

async function getCitations({ source = 'MED', id, pageSize = 25, page = 1 }: Record<string, any> = {}) {
  requireParam({ id }, 'id', 'europepmc.getCitations')
  const qs = buildQuery({ format: 'json', pageSize, page })
  return fetchJSON(`${BASE}/${encodeURIComponent(source)}/${encodeURIComponent(id)}/citations${qs}`, { source: SOURCE })
}

async function getReferences({ source = 'MED', id, pageSize = 25, page = 1 }: Record<string, any> = {}) {
  requireParam({ id }, 'id', 'europepmc.getReferences')
  const qs = buildQuery({ format: 'json', pageSize, page })
  return fetchJSON(`${BASE}/${encodeURIComponent(source)}/${encodeURIComponent(id)}/references${qs}`, { source: SOURCE })
}

export const manifest: IntegrationManifest = {
  key: 'europepmc',
  label: 'Europe PMC',
  description:
    'Biomedical and life-sciences literature search, including citations/references (europepmc.org). No API key required.',
  docsUrl: 'https://europepmc.org/RestfulWebService',
  actions: {
    search: { description: "Full-text/keyword search, e.g. query 'malaria AND vaccine'.", params: { query: 'string, required Europe PMC query syntax', pageSize: 'number, optional (max 1000)', cursorMark: "string, optional pagination cursor (default '*')" } },
    getById: { description: 'Look up a single article by its source ID (e.g. PMID).', params: { id: 'string, required', source: "string, optional 'MED'|'PMC'|'PPR'|'AGR'|'CBA' (default 'MED')" } },
    getCitations: { description: 'List articles that cite the given article.', params: { id: 'string, required', source: "string, optional (default 'MED')", pageSize: 'number, optional', page: 'number, optional' } },
    getReferences: { description: 'List articles referenced by the given article.', params: { id: 'string, required', source: "string, optional (default 'MED')", pageSize: 'number, optional', page: 'number, optional' } },
  },
}

export const actions = { search, getById, getCitations, getReferences }

export default { manifest, actions }
