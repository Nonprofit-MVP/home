'use client'

import { Fragment } from 'react'
import { cn } from '@/lib/utils'

interface CitedTextProps {
  text: string
  maxCitation: number
  onCite?: (n: number) => void
  activeCitation?: number | null
}

// Renders assistant text, converting [n] markers into clickable citation chips.
// Numbers outside 1..maxCitation are left as literal text (the model occasionally
// references things we can't map).
export function CitedText({ text, maxCitation, onCite, activeCitation }: CitedTextProps) {
  const nodes: React.ReactNode[] = []
  const regex = /\[(\d+)\]/g
  let last = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = regex.exec(text)) !== null) {
    const n = parseInt(match[1], 10)
    if (n < 1 || n > maxCitation) continue // leave literal, handled by trailing slice

    if (match.index > last) {
      nodes.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>)
    }
    nodes.push(
      <button
        key={key++}
        type="button"
        onClick={() => onCite?.(n)}
        title={`Jump to source ${n}`}
        className={cn(
          'inline-flex items-center justify-center align-super mx-0.5 min-w-[1.1rem] h-4 px-1 rounded text-[9px] font-mono leading-none transition-colors',
          activeCitation === n
            ? 'bg-[#F5A3FF]/25 text-[#F5A3FF] ring-1 ring-[#F5A3FF]/40'
            : 'bg-[#F5A3FF]/10 text-[#F5A3FF]/80 hover:bg-[#F5A3FF]/20 hover:text-[#F5A3FF]'
        )}
      >
        {n}
      </button>
    )
    last = match.index + match[0].length
  }

  if (last < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>)
  }

  return <>{nodes}</>
}
