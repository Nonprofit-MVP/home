'use client'

import { useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: false })

// Wrap tables so they can scroll, and force external links to open safely.
function postProcess(html: string): string {
  let out = html
    .replace(/<table\b/gi, '<div class="table-wrap"><table')
    .replace(/<\/table>/gi, '</table></div>')
  out = out.replace(/<a /gi, '<a target="_blank" rel="noopener noreferrer" ')
  return out
}

export function Markdown({ content }: { content: string }) {
  const html = useMemo(() => {
    const processed = postProcess(marked.parse(content || '', { async: false }) as string)
    // DOMPurify needs a DOM; only sanitize in the browser (messages render
    // client-side, so this is the real path anyway).
    if (typeof window === 'undefined') return processed
    return DOMPurify.sanitize(processed, { ADD_ATTR: ['target', 'rel'] })
  }, [content])

  return <div className="chat-md" dangerouslySetInnerHTML={{ __html: html }} />
}
