import { UpstreamError } from '../http'
import type { IntegrationModule } from './types'
import openalex from './openalex'
import semanticScholar from './semanticScholar'
import crossref from './crossref'
import pubmed from './pubmed'
import arxiv from './arxiv'
import core from './core'
import europepmc from './europepmc'
import wikipedia from './wikipedia'

export const SOURCES: Record<string, IntegrationModule> = {
  openalex,
  semanticScholar,
  crossref,
  pubmed,
  arxiv,
  core,
  europepmc,
  wikipedia,
}

export function listManifest() {
  return Object.fromEntries(Object.entries(SOURCES).map(([key, mod]) => [key, mod.manifest]))
}

export async function callAction(
  sourceKey: string,
  actionKey: string,
  params: Record<string, any> = {}
): Promise<unknown> {
  const mod = SOURCES[sourceKey]
  if (!mod) {
    throw new UpstreamError(
      `Unknown source "${sourceKey}". Available sources: ${Object.keys(SOURCES).join(', ')}`,
      { status: 400, source: 'dispatcher' }
    )
  }
  const action = mod.actions[actionKey]
  if (!action) {
    throw new UpstreamError(
      `Unknown action "${actionKey}" for source "${sourceKey}". Available actions: ${Object.keys(mod.actions).join(', ')}`,
      { status: 400, source: mod.manifest.label }
    )
  }
  return action(params || {})
}

export { UpstreamError }
