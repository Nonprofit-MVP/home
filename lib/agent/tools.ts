// Converts the ported integration manifests into OpenAI tool definitions,
// executes tool calls (external scholarly APIs + internal Journality search),
// and normalizes search results into citable sources.
import { SOURCES, callAction } from './integrations'
import type { ActionManifest } from './integrations/types'
import { INTERNAL_TOOLS, type InternalToolContext } from './internal-tools'
import type { OAITool } from './providers'
import { envKey } from './http'
import { errorMessage } from './util'

export interface AgentSource {
  title: string
  url?: string
  doi?: string
  year?: number | string | null
  venue?: string | null
  authors?: string[]
}

const DEFAULT_ALLOWLIST = [
  'openalex_searchWorks',
  'openalex_getWork',
  'openalex_getWorksByAuthor',
  'semanticScholar_searchPapers',
  'semanticScholar_getPaper',
  'semanticScholar_getPaperCitations',
  'semanticScholar_getPaperReferences',
  'crossref_searchWorks',
  'crossref_getWork',
  'pubmed_searchAndSummarize',
  'pubmed_fetchRecords',
  'arxiv_search',
  'arxiv_getById',
  'europepmc_search',
  'europepmc_getCitations',
  'core_searchWorks',
  'wikipedia_search',
  'wikipedia_getSummary',
]

function enabledToolNames(): Set<string> {
  const override = process.env.AGENT_ENABLED_TOOLS?.trim()
  const names = override
    ? override.split(',').map(s => s.trim()).filter(Boolean)
    : [...DEFAULT_ALLOWLIST]
  const set = new Set(names)
  // CORE hard-fails 401 without a key — hide its tools rather than let the
  // model waste iterations on guaranteed errors.
  if (!envKey('CORE_API_KEY')) {
    for (const name of Array.from(set)) {
      if (name.startsWith('core_')) set.delete(name)
    }
  }
  if (process.env.AGENT_ENABLE_WIKIPEDIA === 'false') {
    for (const name of Array.from(set)) {
      if (name.startsWith('wikipedia_')) set.delete(name)
    }
  }
  return set
}

// The manifests document params as prose strings (verified format:
// "string, required ...", "number, optional (default 20)", "string or array
// of IDs, required"). Parse leading type token + required flag; keep the full
// string as the property description. Lenient schema — params pass through to
// callAction unchanged.
function jsonSchemaFromParams(params: Record<string, string>): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []
  for (const [name, doc] of Object.entries(params)) {
    const prop: Record<string, unknown> = { description: doc }
    if (/^string or array/i.test(doc)) {
      // union — omit type, description carries the contract
    } else if (/^number/i.test(doc)) {
      prop.type = 'number'
    } else if (/^string/i.test(doc)) {
      prop.type = 'string'
    }
    properties[name] = prop
    if (/\brequired\b/i.test(doc)) required.push(name)
  }
  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: true,
  }
}

export function buildAgentTools(): OAITool[] {
  const enabled = enabledToolNames()
  const tools: OAITool[] = []

  for (const [sourceKey, mod] of Object.entries(SOURCES)) {
    for (const [actionKey, action] of Object.entries(mod.manifest.actions) as [string, ActionManifest][]) {
      const name = `${sourceKey}_${actionKey}`
      if (!enabled.has(name)) continue
      tools.push({
        type: 'function',
        function: {
          name,
          description: `${mod.manifest.label}: ${action.description}`,
          parameters: jsonSchemaFromParams(action.params),
        },
      })
    }
  }

  for (const tool of Object.values(INTERNAL_TOOLS)) {
    tools.push(tool.definition)
  }

  return tools
}

export async function executeTool(
  name: string,
  args: Record<string, any>,
  ctx: InternalToolContext
): Promise<unknown> {
  const internal = INTERNAL_TOOLS[name]
  if (internal) {
    return internal.run(args || {}, ctx)
  }
  const sep = name.indexOf('_')
  if (sep < 1) {
    return { ok: false, error: `Unknown tool "${name}"` }
  }
  const sourceKey = name.slice(0, sep)
  const actionKey = name.slice(sep + 1)
  try {
    const result = await callAction(sourceKey, actionKey, args || {})
    return result ?? { ok: true }
  } catch (err) {
    // Surface upstream failures as tool results so the model can adapt
    // (retry with a different source/query) instead of killing the request.
    return { ok: false, error: errorMessage(err) }
  }
}

// ---- Source extraction ----------------------------------------------------

const MAX_SOURCES_PER_CALL = 5

function doiUrl(doi?: string | null): string | undefined {
  if (!doi) return undefined
  const clean = String(doi).replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
  return `https://doi.org/${clean}`
}

function cleanSource(s: Partial<AgentSource>): AgentSource | null {
  if (!s.title) return null
  return {
    title: String(s.title),
    url: s.url || doiUrl(s.doi),
    doi: s.doi ? String(s.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//, '') : undefined,
    year: s.year ?? null,
    venue: s.venue ?? null,
    authors: (s.authors || []).filter(Boolean).slice(0, 6),
  }
}

function fromOpenAlexWork(w: any): AgentSource | null {
  if (!w) return null
  return cleanSource({
    title: w.display_name || w.title,
    url: w.doi || w.id,
    doi: w.doi,
    year: w.publication_year,
    venue: w.primary_location?.source?.display_name,
    authors: (w.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean),
  })
}

function fromS2Paper(p: any): AgentSource | null {
  if (!p) return null
  const authors = Array.isArray(p.authors)
    ? p.authors.map((a: any) => (typeof a === 'string' ? a : a?.name)).filter(Boolean)
    : []
  return cleanSource({
    title: p.title,
    url: p.url || doiUrl(p.externalIds?.DOI || p.doi),
    doi: p.externalIds?.DOI || p.doi,
    year: p.year,
    venue: p.venue,
    authors,
  })
}

function fromCrossrefItem(it: any): AgentSource | null {
  if (!it) return null
  return cleanSource({
    title: Array.isArray(it.title) ? it.title[0] : it.title,
    url: it.URL,
    doi: it.DOI,
    year: it.issued?.['date-parts']?.[0]?.[0],
    venue: Array.isArray(it['container-title']) ? it['container-title'][0] : it['container-title'],
    authors: (it.author || []).map((a: any) => [a.given, a.family].filter(Boolean).join(' ')).filter(Boolean),
  })
}

function fromPubmedSummary(r: any): AgentSource | null {
  if (!r) return null
  const doi = (r.articleids || []).find((a: any) => a.idtype === 'doi')?.value
  return cleanSource({
    title: r.title,
    url: r.uid ? `https://pubmed.ncbi.nlm.nih.gov/${r.uid}/` : doiUrl(doi),
    doi,
    year: typeof r.pubdate === 'string' ? r.pubdate.slice(0, 4) : null,
    venue: r.fulljournalname || r.source,
    authors: (r.authors || []).map((a: any) => a.name).filter(Boolean),
  })
}

function fromArxivEntry(e: any): AgentSource | null {
  if (!e) return null
  return cleanSource({
    title: e.title,
    url: e.url,
    year: typeof e.published === 'string' ? e.published.slice(0, 4) : null,
    venue: 'arXiv',
    authors: e.authors,
  })
}

function fromEuropePmc(r: any): AgentSource | null {
  if (!r) return null
  return cleanSource({
    title: r.title,
    url: doiUrl(r.doi) || (r.pmid ? `https://europepmc.org/abstract/MED/${r.pmid}` : undefined),
    doi: r.doi,
    year: r.pubYear,
    venue: r.journalTitle,
    authors: r.authorString ? [r.authorString] : [],
  })
}

function fromCoreWork(w: any): AgentSource | null {
  if (!w) return null
  return cleanSource({
    title: w.title,
    url: doiUrl(w.doi) || w.downloadUrl,
    doi: w.doi,
    year: w.yearPublished,
    venue: w.publisher,
    authors: (w.authors || []).map((a: any) => (typeof a === 'string' ? a : a?.name)).filter(Boolean),
  })
}

function fromJournalityPaper(p: any): AgentSource | null {
  if (!p) return null
  return cleanSource({
    title: p.title,
    url: `/papers/${p.id}`,
    doi: p.doi,
    year: typeof p.created_at === 'string' ? p.created_at.slice(0, 4) : null,
    venue: 'Journality',
    authors: (p.authors || []).map((a: any) => a?.name).filter(Boolean),
  })
}

export function extractSources(toolName: string, result: any): AgentSource[] {
  if (!result || typeof result !== 'object') return []
  let mapped: (AgentSource | null)[] = []

  if (toolName.startsWith('openalex_')) {
    if (Array.isArray(result.results)) mapped = result.results.map(fromOpenAlexWork)
    else if (result.display_name || result.title) mapped = [fromOpenAlexWork(result)]
  } else if (toolName.startsWith('semanticScholar_')) {
    if (Array.isArray(result.data)) {
      // Citation/reference endpoints nest the paper under citingPaper/citedPaper.
      mapped = result.data.map((d: any) => fromS2Paper(d.citingPaper || d.citedPaper || d))
    } else if (result.title) {
      mapped = [fromS2Paper(result)]
    }
  } else if (toolName.startsWith('crossref_')) {
    const items = result.message?.items
    if (Array.isArray(items)) mapped = items.map(fromCrossrefItem)
    else if (result.message?.title) mapped = [fromCrossrefItem(result.message)]
  } else if (toolName.startsWith('pubmed_')) {
    if (Array.isArray(result.results)) mapped = result.results.map(fromPubmedSummary)
  } else if (toolName.startsWith('arxiv_')) {
    if (Array.isArray(result.entries)) mapped = result.entries.map(fromArxivEntry)
  } else if (toolName.startsWith('europepmc_')) {
    const items = result.resultList?.result
    if (Array.isArray(items)) mapped = items.map(fromEuropePmc)
  } else if (toolName.startsWith('core_')) {
    if (Array.isArray(result.results)) mapped = result.results.map(fromCoreWork)
  } else if (toolName === 'search_journality_papers') {
    if (Array.isArray(result.papers)) mapped = result.papers.map(fromJournalityPaper)
  } else if (toolName === 'get_journality_paper') {
    if (result.paper) mapped = [fromJournalityPaper(result.paper)]
  }

  return mapped.filter((s): s is AgentSource => !!s).slice(0, MAX_SOURCES_PER_CALL)
}
