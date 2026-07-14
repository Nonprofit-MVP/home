// Grounding utilities for Anara-style cited chat.
// A paper's abstract is split into numbered "source" segments. The chat model
// is told to cite these with [n] markers, and the reader maps [n] back to the
// exact sentence so a citation click can highlight its source in the document.

export interface PaperSource {
  id: number // 1-based citation number
  text: string
}

// Split prose into sentence-sized segments. Kept deliberately simple and
// deterministic so the client and server agree on numbering.
export function splitSentences(text: string): string[] {
  if (!text) return []
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return []
  const matches = normalized.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g)
  return (matches || [normalized])
    .map(s => s.trim())
    .filter(s => s.length > 1)
}

// Build the numbered source list from a paper's abstract. These are the exact
// segments rendered (with ids) in the reader's document panel, so citation
// numbers line up with highlightable sentences.
export function buildPaperSources(paper: { abstract?: string | null }): PaperSource[] {
  return splitSentences(paper.abstract || '').map((text, i) => ({ id: i + 1, text }))
}
