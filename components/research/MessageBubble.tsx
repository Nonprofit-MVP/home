'use client'

import { useState } from 'react'
import { Brain, ChevronRight, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Markdown } from './Markdown'
import { ToolActivity } from './ToolActivity'
import { SourceList } from './SourceList'
import { LoaderDots } from './LoaderDots'
import type { AgentSource, AgentToolEvent } from '@/types'

export interface UIMessage {
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  toolEvents?: AgentToolEvent[]
  sources?: AgentSource[]
  error?: string
}

function ReasoningPanel({ reasoning, active }: { reasoning: string; active?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-3 rounded-xl border border-white/8 bg-white/[0.02]">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <Brain className="w-3.5 h-3.5 text-zinc-500" />
        <span>{active ? 'Thinking' : 'Reasoning'}</span>
        {active && <LoaderDots />}
        <ChevronRight className={cn('w-4 h-4 ml-auto transition-transform', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="border-t border-white/8 px-3 py-2.5 max-h-72 overflow-y-auto text-[13px] leading-6 text-zinc-500 whitespace-pre-wrap">
          {reasoning}
        </div>
      )}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1400)
        } catch {}
      }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-mono transition-colors',
        copied
          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
          : 'border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/15'
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function MessageBubble({ message, streaming }: { message: UIMessage; streaming?: boolean }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-[#F5A3FF]/10 border border-[#F5A3FF]/15 rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed text-zinc-100 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }

  const thinking = streaming && !message.content
  const showControls = !streaming && !!message.content

  return (
    <div className="group">
      {message.reasoning && <ReasoningPanel reasoning={message.reasoning} active={thinking} />}

      {message.toolEvents && message.toolEvents.length > 0 && (
        <ToolActivity events={message.toolEvents} />
      )}

      {message.content ? (
        <Markdown content={message.content} />
      ) : thinking && !message.reasoning ? (
        <LoaderDots label="Thinking…" />
      ) : null}

      {message.error && <p className="mt-2 text-sm font-mono text-red-400">{message.error}</p>}

      {message.sources && message.sources.length > 0 && <SourceList sources={message.sources} />}

      {showControls && (
        <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <CopyButton text={message.content} />
        </div>
      )}
    </div>
  )
}
