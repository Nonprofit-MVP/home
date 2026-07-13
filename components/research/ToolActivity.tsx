'use client'

import { Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentToolEvent } from '@/types'

const TOOL_LABELS: Record<string, string> = {
  openalex_searchWorks: 'Searching OpenAlex',
  openalex_getWork: 'Fetching from OpenAlex',
  openalex_getWorksByAuthor: 'Listing author works (OpenAlex)',
  semanticScholar_searchPapers: 'Searching Semantic Scholar',
  semanticScholar_getPaper: 'Fetching from Semantic Scholar',
  semanticScholar_getPaperCitations: 'Chasing citations (Semantic Scholar)',
  semanticScholar_getPaperReferences: 'Reading references (Semantic Scholar)',
  crossref_searchWorks: 'Searching Crossref',
  crossref_getWork: 'Resolving DOI (Crossref)',
  pubmed_searchAndSummarize: 'Searching PubMed',
  pubmed_fetchRecords: 'Fetching PubMed records',
  arxiv_search: 'Searching arXiv',
  arxiv_getById: 'Fetching arXiv preprint',
  europepmc_search: 'Searching Europe PMC',
  europepmc_getCitations: 'Chasing citations (Europe PMC)',
  core_searchWorks: 'Searching CORE',
  wikipedia_search: 'Searching Wikipedia',
  wikipedia_getSummary: 'Reading Wikipedia',
  search_journality_papers: 'Searching Journality papers',
  get_journality_paper: 'Reading Journality paper',
  search_journality_articles: 'Searching Journality articles',
}

export function toolLabel(name: string): string {
  return TOOL_LABELS[name] || name.replace(/_/g, ' ')
}

function queryOf(event: AgentToolEvent): string | null {
  const a = event.args as Record<string, unknown> | undefined
  const q = a?.query ?? a?.term ?? a?.search ?? a?.id ?? a?.doi ?? a?.title
  return typeof q === 'string' ? q : null
}

export function ToolActivity({ events, compact = false }: { events: AgentToolEvent[]; compact?: boolean }) {
  if (!events.length) return null

  if (compact) {
    return (
      <div className="mb-2 flex flex-wrap gap-1.5">
        {events.map(event => (
          <span
            key={event.id + event.name}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]',
              event.status === 'running'
                ? 'border-white/10 text-zinc-400 bg-white/[0.03]'
                : event.ok === false
                  ? 'border-red-500/20 text-red-400/80 bg-red-500/5'
                  : 'border-white/8 text-zinc-500 bg-white/[0.02]'
            )}
          >
            {event.status === 'running' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : event.ok === false ? (
              <X className="w-3 h-3" />
            ) : (
              <Check className="w-3 h-3 text-emerald-400/70" />
            )}
            {toolLabel(event.name)}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="mb-3 rounded-xl border border-white/8 bg-white/[0.02] divide-y divide-white/5">
      {events.map(event => {
        const q = queryOf(event)
        return (
          <div key={event.id + event.name} className="flex items-center gap-2.5 px-3 py-2">
            {event.status === 'running' ? (
              <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin shrink-0" />
            ) : event.ok === false ? (
              <X className="w-3.5 h-3.5 text-red-400 shrink-0" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span className="text-[13px] text-zinc-300">{toolLabel(event.name)}</span>
            {q && (
              <span className="text-[12px] text-zinc-600 font-mono truncate">“{q}”</span>
            )}
            {event.status === 'done' && typeof event.ms === 'number' && (
              <span className="ml-auto text-[11px] text-zinc-700 font-mono shrink-0">
                {(event.ms / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
