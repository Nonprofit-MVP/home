'use client'

import { useState, useRef, useEffect } from 'react'
import { Quote, Copy, Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { Paper, Author } from '@/types'

function formatAuthorsAPA(authors: Author[]): string {
  if (!authors?.length) return 'Unknown'
  return authors.map(a => {
    const parts = a.name.trim().split(' ')
    const last = parts[parts.length - 1]
    const initials = parts.slice(0, -1).map(p => p[0] + '.').join(' ')
    return initials ? `${last}, ${initials}` : last
  }).join(', ')
}

function formatAuthorsMLA(authors: Author[]): string {
  if (!authors?.length) return 'Unknown'
  if (authors.length === 1) return authors[0].name
  const parts = authors[0].name.trim().split(' ')
  const first = `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`
  const rest = authors.slice(1).map(a => a.name).join(', ')
  return `${first}, ${rest}`
}

function formatAuthorsBib(authors: Author[]): string {
  if (!authors?.length) return 'Unknown'
  return authors.map(a => a.name).join(' and ')
}

function getYear(paper: Paper): string {
  const d = paper.published_at || paper.created_at
  return d ? new Date(d).getFullYear().toString() : new Date().getFullYear().toString()
}

function buildCitations(paper: Paper) {
  const authors = Array.isArray(paper.authors) ? paper.authors as Author[] : []
  const year = getYear(paper)
  const url = typeof window !== 'undefined'
    ? window.location.href
    : `https://singularity.app/papers/${paper.id}`
  const bibKey = (authors[0]?.name.split(' ').pop() ?? 'unknown').toLowerCase() + year

  return {
    APA: `${formatAuthorsAPA(authors)} (${year}). ${paper.title}. Singularity. ${url}`,
    MLA: `${formatAuthorsMLA(authors)}. "${paper.title}." Singularity, ${year}. ${url}`,
    Chicago: `${authors.map(a => a.name).join(', ')}. "${paper.title}." Singularity (${year}). ${url}`,
    BibTeX: `@article{${bibKey},\n  title   = {${paper.title}},\n  author  = {${formatAuthorsBib(authors)}},\n  year    = {${year}},\n  url     = {${url}}\n}`,
  }
}

type Format = 'APA' | 'MLA' | 'Chicago' | 'BibTeX'
const FORMATS: Format[] = ['APA', 'MLA', 'Chicago', 'BibTeX']

export function CiteButton({ paper }: { paper: Paper }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Format>('APA')
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const citations = buildCitations(paper)
  const text = citations[active]

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div ref={ref} className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(v => !v)}>
        <Quote className="w-3.5 h-3.5" />
        Cite
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[420px] max-w-[calc(100vw-2rem)] bg-[#111111] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Format tabs */}
          <div className="flex items-center border-b border-white/8 px-1 pt-1">
            {FORMATS.map(f => (
              <button
                key={f}
                onClick={() => setActive(f)}
                className={cn(
                  'px-3 py-2 text-xs font-mono transition-colors rounded-t',
                  active === f
                    ? 'text-[#F5A3FF] border-b-2 border-[#F5A3FF]'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Citation text */}
          <div className="p-4">
            <pre className={cn(
              'text-xs leading-relaxed whitespace-pre-wrap break-words font-mono text-zinc-300',
              active === 'BibTeX' ? 'font-mono' : 'font-sans'
            )}>
              {text}
            </pre>
          </div>

          {/* Copy button */}
          <div className="flex justify-end px-4 pb-4">
            <Button variant={copied ? 'primary' : 'outline'} size="sm" onClick={copy}>
              {copied
                ? <><Check className="w-3.5 h-3.5" />Copied!</>
                : <><Copy className="w-3.5 h-3.5" />Copy</>
              }
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
