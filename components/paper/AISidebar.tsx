'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Cpu, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PaperCard } from '@/components/ui/PaperCard'
import { cn } from '@/lib/utils'
import type { ChatMessage, Paper } from '@/types'

interface AISidebarProps {
  paper: Paper
  relatedPapers?: Paper[]
}

const SUGGESTED_QUESTIONS = [
  'What are the key findings?',
  'What are the limitations?',
  'How does this compare to prior work?',
]

export function AISidebar({ paper, relatedPapers = [] }: AISidebarProps) {
  const [tldr, setTldr] = useState(paper.tldr || '')
  const [tldrMode, setTldrMode] = useState<'technical' | 'plain'>('technical')
  const [tldrLoading, setTldrLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loadedRelated, setLoadedRelated] = useState<Paper[]>(relatedPapers)
  const [relatedLoading, setRelatedLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const loadedRef = useRef(false)

  // Lazy load on visibility
  useEffect(() => {
    const el = sidebarRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !loadedRef.current) {
          loadedRef.current = true
          // Load related papers if not already loaded
          if (loadedRelated.length === 0) {
            setRelatedLoading(true)
            try {
              const res = await fetch('/api/ai/related', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: paper.title, abstract: paper.abstract, tags: paper.field_tags }),
              })
              if (res.ok) {
                const data = await res.json()
                setLoadedRelated(data.papers || [])
              }
            } finally {
              setRelatedLoading(false)
            }
          }
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [paper, loadedRelated.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const switchMode = async (mode: 'technical' | 'plain') => {
    if (mode === tldrMode) return
    setTldrMode(mode)
    if (mode === 'plain') {
      setTldrLoading(true)
      try {
        const res = await fetch('/api/ai/tldr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: paper.title,
            abstract: paper.abstract,
            mode: 'plain',
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setTldr(data.tldr)
        }
      } finally {
        setTldrLoading(false)
      }
    } else {
      setTldr(paper.tldr || '')
    }
  }

  const sendMessage = async (question?: string) => {
    const content = question || input.trim()
    if (!content || streaming) return

    const userMsg: ChatMessage = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    const paperContext = `Title: ${paper.title}\n\nAbstract: ${paper.abstract}\n\nTL;DR: ${paper.tldr || ''}`
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: paper.id,
          messages: newMessages,
          paperContext,
        }),
      })

      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                fullText += parsed.text
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: fullText }
                  return updated
                })
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div ref={sidebarRef} className="space-y-4">
      {/* AI Summary */}
      <div className="bg-[#111111] border border-white/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-[#F5A3FF]" />
            <span className="text-xs font-mono font-medium text-zinc-300">AI Summary</span>
          </div>
          {/* Mode toggle */}
          <div className="flex items-center bg-white/[0.04] rounded-md border border-white/8 p-0.5">
            {(['technical', 'plain'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => switchMode(mode)}
                className={cn(
                  'px-2 py-0.5 text-[10px] font-mono rounded transition-all',
                  tldrMode === mode
                    ? 'bg-[#F5A3FF]/15 text-[#F5A3FF]'
                    : 'text-zinc-600 hover:text-zinc-400'
                )}
              >
                {mode === 'technical' ? 'Technical' : 'Plain English'}
              </button>
            ))}
          </div>
        </div>

        {tldrLoading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Loader2 className="w-3 h-3 text-[#F5A3FF]" style={{ animation: 'spin 0.5s linear infinite' }} />
            <span className="font-mono">Rephrasing...</span>
          </div>
        ) : tldr ? (
          <p className="text-sm text-zinc-400 leading-relaxed">{tldr}</p>
        ) : (
          <p className="text-xs text-zinc-600 font-mono italic">No summary available</p>
        )}

        <p className="text-[10px] text-zinc-700 mt-2 font-mono">generated by AI · may contain errors</p>
      </div>

      {/* Chat */}
      <div className="bg-[#111111] border border-white/8 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#F5A3FF] animate-pulse" />
          <span className="text-xs font-mono font-medium text-zinc-300">Ask this paper</span>
        </div>

        {/* Messages */}
        {messages.length > 0 && (
          <div className="max-h-[300px] overflow-y-auto mb-3 space-y-3 pr-1">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'text-xs leading-relaxed',
                  msg.role === 'user'
                    ? 'text-zinc-300 bg-white/[0.04] rounded-lg px-3 py-2'
                    : 'text-zinc-400'
                )}
              >
                {msg.content}
                {streaming && i === messages.length - 1 && msg.role === 'assistant' && (
                  <span className="inline-block w-1 h-3 bg-[#F5A3FF] ml-0.5 animate-pulse" />
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Suggested questions */}
        {messages.length === 0 && (
          <div className="flex flex-col gap-1.5 mb-3">
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-left text-[11px] text-zinc-500 hover:text-zinc-300 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded px-2.5 py-1.5 transition-all font-mono"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask anything about this paper..."
            disabled={streaming}
            className="flex-1 bg-white/[0.03] border border-white/8 rounded px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-[#F5A3FF]/30 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            className="p-2 bg-[#F5A3FF]/10 hover:bg-[#F5A3FF]/20 border border-[#F5A3FF]/20 rounded text-[#F5A3FF] disabled:opacity-30 transition-all"
          >
            {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Related Papers */}
      <div className="bg-[#111111] border border-white/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-medium text-zinc-300">Related Papers</span>
          <span className="text-[10px] text-zinc-700 font-mono">loaded by AI</span>
        </div>

        {relatedLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-white/[0.03] rounded animate-pulse" />
            ))}
          </div>
        ) : loadedRelated.length > 0 ? (
          <div className="space-y-2">
            {loadedRelated.slice(0, 4).map(p => (
              <PaperCard key={p.id} paper={p} compact />
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-600 font-mono">No related papers found</p>
        )}
      </div>
    </div>
  )
}
