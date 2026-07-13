import { fetchJSON, fetchText, buildQuery, requireParam } from '../http'
import type { IntegrationManifest } from './types'

const SOURCE = 'Wikipedia'

function restBase(lang: string) {
  return `https://${lang}.wikipedia.org/api/rest_v1`
}
function coreBase(lang: string) {
  return `https://${lang}.wikipedia.org/w/rest.php/v1`
}

async function search({ query, limit = 10, lang = 'en' }: Record<string, any> = {}) {
  requireParam({ query }, 'query', 'wikipedia.search')
  const qs = buildQuery({ q: query, limit })
  // The core REST search endpoint 429s under light load; one paced retry clears it.
  return fetchJSON(`${coreBase(lang)}/search/page${qs}`, { source: SOURCE, retries: 1, retryBackoffMs: 1000 })
}

async function getSummary({ title, lang = 'en' }: Record<string, any> = {}) {
  requireParam({ title }, 'title', 'wikipedia.getSummary')
  return fetchJSON(`${restBase(lang)}/page/summary/${encodeURIComponent(title)}`, { source: SOURCE })
}

// Wikimedia restricted the REST v1 /page/related/ endpoint (returns 403 for
// anonymous callers), so "related pages" is served via the core REST search
// API's `morelike:` operator, which finds pages similar to the given title.
async function getRelated({ title, limit = 10, lang = 'en' }: Record<string, any> = {}) {
  requireParam({ title }, 'title', 'wikipedia.getRelated')
  const qs = buildQuery({ q: `morelike:${title}`, limit })
  return fetchJSON(`${coreBase(lang)}/search/page${qs}`, { source: SOURCE })
}

async function getHtml({ title, lang = 'en' }: Record<string, any> = {}) {
  requireParam({ title }, 'title', 'wikipedia.getHtml')
  const html = await fetchText(`${restBase(lang)}/page/html/${encodeURIComponent(title)}`, {
    source: SOURCE,
    headers: { Accept: 'text/html' },
  })
  return { title, html }
}

export const manifest: IntegrationManifest = {
  key: 'wikipedia',
  label: 'Wikipedia REST',
  description: "Article search, summaries, and related pages via Wikipedia's REST API. No API key required.",
  docsUrl: 'https://en.wikipedia.org/api/rest_v1/',
  actions: {
    search: { description: 'Search article titles.', params: { query: 'string, required', limit: 'number, optional (default 10)', lang: "string, optional wiki language code (default 'en')" } },
    getSummary: { description: 'Get a short summary + thumbnail for a page (good for background/definitions).', params: { title: 'string, required exact page title', lang: "string, optional (default 'en')" } },
    getRelated: { description: "Find pages related to a given page (via a 'morelike' similarity search).", params: { title: 'string, required', limit: 'number, optional (default 10)', lang: "string, optional (default 'en')" } },
    getHtml: { description: 'Get the full rendered HTML of a page.', params: { title: 'string, required', lang: "string, optional (default 'en')" } },
  },
}

export const actions = { search, getSummary, getRelated, getHtml }

export default { manifest, actions }
