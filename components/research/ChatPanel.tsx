'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Square, Menu, Sparkles } from 'lucide-react'
import { MessageBubble, type UIMessage } from './MessageBubble'
import { ProviderSelect } from './ProviderSelect'

const SUGGESTED_PROMPTS = [
  'Find recent papers on CRISPR off-target effects',
  'Summarize the evidence for intermittent fasting and longevity',
  'Who are the key authors in quantum error correction?',
  'Has anyone replicated the ego depletion effect?',
]

const MAX_MESSAGE_CHARS = 4000

interface ChatPanelProps {
  messages: UIMessage[]
  streaming: boolean
  loading: boolean
  provider: string | null
  onProviderChange: (id: string) => void
  onSend: (message: string) => void
  onAbort: () => void
  onOpenSidebar?: () => void
}

export function ChatPanel({
  messages,
  streaming,
  loading,
  provider,
  onProviderChange,
  onSend,
  onAbort,
  onOpenSidebar,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  // Stick to the bottom only when the user is already there — never yank them
  // back down while they're scrolled up reading, and don't scroll on typing.
  const stickRef = useRef(true)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  useEffect(() => {
    const el = scrollRef.current
    if (el && stickRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const submit = (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || streaming) return
    setInput('')
    stickRef.current = true // new message → jump to bottom
    onSend(content)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-white/8 shrink-0">
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-1.5 rounded hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#F5A3FF]" />
          <span className="text-sm font-mono font-medium text-zinc-200">Research Assistant</span>
        </div>
        <div className="ml-auto">
          <ProviderSelect value={provider} onChange={onProviderChange} />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto px-5 py-6">
        {loading ? (
          <div className="space-y-3 max-w-[820px] mx-auto">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white/[0.03] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-6 max-w-lg mx-auto text-center">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#F5A3FF]" />
              <span className="font-mono text-lg text-zinc-100">What are you researching?</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              I search OpenAlex, Semantic Scholar, PubMed, arXiv, Crossref, Europe PMC, and
              Journality itself
            </p>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTED_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  onClick={() => submit(prompt)}
                  className="text-left text-sm text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/8 rounded-lg px-4 py-3 transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-7 max-w-[820px] mx-auto pb-2">
            {messages.map((message, i) => (
              <MessageBubble
                key={i}
                message={message}
                streaming={streaming && i === messages.length - 1 && message.role === 'assistant'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="px-5 pb-5 pt-2 shrink-0">
        <div className="max-w-[820px] mx-auto">
          <div className="flex items-end gap-2 bg-white/[0.04] border border-white/10 rounded-2xl p-2.5 focus-within:border-[#F5A3FF]/40 transition-colors">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="Ask a research question..."
              rows={Math.min(5, Math.max(1, input.split('\n').length))}
              disabled={streaming}
              className="flex-1 bg-transparent text-[15px] text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none px-2 py-1.5 disabled:opacity-50"
            />
            {streaming ? (
              <button
                onClick={onAbort}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition-all"
                title="Stop"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => submit()}
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-[#F5A3FF]/15 hover:bg-[#F5A3FF]/25 border border-[#F5A3FF]/25 text-[#F5A3FF] disabled:opacity-30 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-zinc-600 mt-2 font-mono text-center">
            scientific research only · answers cite their sources · may contain errors
          </p>
        </div>
      </div>
    </div>
  )
}
