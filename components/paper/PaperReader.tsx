'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Send, Loader2, Cpu, Sparkles, MessageSquare, GraduationCap,
  FileText, ExternalLink, WandSparkles, X, RotateCw, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildPaperSources } from '@/lib/paper-sources'
import { CitedText } from '@/components/paper/CitedText'
import { Markdown } from '@/components/research/Markdown'
import { ToolActivity } from '@/components/research/ToolActivity'
import { SourceList } from '@/components/research/SourceList'
import { LoaderDots } from '@/components/research/LoaderDots'
import { useAgentStream } from '@/components/research/useAgentStream'
import { createClient } from '@/lib/supabase'
import type { Paper, AgentSource, AgentToolEvent } from '@/types'
import type { StudyTools } from '@/app/api/ai/study/route'

interface PaperReaderProps {
  paper: Paper
  pdfUrl?: string
}

const SUGGESTED = [
  'What are the key findings?',
  'Explain the method simply',
  'What are the limitations?',
  'How does this compare to prior work?',
]

type RightTab = 'chat' | 'study'
type DocView = 'text' | 'pdf'

interface ReaderMessage {
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  toolEvents?: AgentToolEvent[]
  sources?: AgentSource[]
}

export function PaperReader({ paper, pdfUrl }: PaperReaderProps) {
  const sources = useMemo(() => buildPaperSources(paper), [paper])

  const [messages, setMessages] = useState<ReaderMessage[]>([])
  const [input, setInput] = useState('')
  const [legacyStreaming, setLegacyStreaming] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activeCite, setActiveCite] = useState<number | null>(null)
  const [rightTab, setRightTab] = useState<RightTab>('chat')
  const [docView, setDocView] = useState<DocView>('text')

  const [study, setStudy] = useState<StudyTools | null>(null)
  const [studyLoading, setStudyLoading] = useState(false)
  const [studyError, setStudyError] = useState<string | null>(null)
  const [flipped, setFlipped] = useState<Set<number>>(new Set())

  const [selection, setSelection] = useState<{ text: string; top: number; left: number } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const docTextRef = useRef<HTMLDivElement>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Persists the agent thread across sends — it also shows up in /research.
  const conversationIdRef = useRef<string | null>(null)
  const { sendMessage: sendAgentMessage, streaming: agentStreaming } = useAgentStream()
  const streaming = legacyStreaming || agentStreaming

  // Logged-in users get the full research agent (tools + literature sources);
  // guests keep the lightweight grounded paper-context chat.
  useEffect(() => {
    createClient()
      .auth.getSession()
      .then(({ data }: { data: { session: unknown } }) => {
        if (data.session) setIsLoggedIn(true)
      })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ---- Chat: same agent architecture as the sidebar/research workspace ----
  const patchLastAssistant = (patch: (msg: ReaderMessage) => ReaderMessage) => {
    setMessages(prev => {
      const updated = [...prev]
      const last = updated[updated.length - 1]
      if (last?.role === 'assistant') updated[updated.length - 1] = patch(last)
      return updated
    })
  }

  const paperContext = () =>
    `Title: ${paper.title}\n\nAbstract: ${paper.abstract}\n\nTL;DR: ${paper.tldr || ''}`

  // Logged-in path: the tool-using research agent (OpenRouter et al.).
  const sendViaAgent = (content: string) => {
    sendAgentMessage(
      {
        conversationId: conversationIdRef.current ?? undefined,
        message: content,
        context: { type: 'paper', paperId: paper.id, paperContext: paperContext() },
      },
      {
        onEvent: event => {
          switch (event.type) {
            case 'meta':
              conversationIdRef.current = event.conversationId
              break
            case 'token':
              patchLastAssistant(msg => ({ ...msg, content: msg.content + event.text }))
              break
            case 'reasoning':
              patchLastAssistant(msg => ({ ...msg, reasoning: (msg.reasoning || '') + event.text }))
              break
            case 'reset':
              patchLastAssistant(msg => ({ ...msg, content: '', reasoning: '' }))
              break
            case 'tool':
              patchLastAssistant(msg => {
                const events: AgentToolEvent[] = [...(msg.toolEvents || [])]
                const idx = events.findIndex(e => e.id === event.id && e.name === event.name)
                const entry: AgentToolEvent = { id: event.id, name: event.name, status: event.status, ok: event.ok, ms: event.ms }
                if (idx >= 0) events[idx] = { ...events[idx], ...entry }
                else events.push(entry)
                return { ...msg, toolEvents: events }
              })
              break
            case 'sources':
              patchLastAssistant(msg => ({ ...msg, sources: event.sources }))
              break
            case 'error':
              patchLastAssistant(msg => ({ ...msg, content: msg.content || 'Sorry, I encountered an error. Please try again.' }))
              break
          }
        },
      }
    )
  }

  // Guest path: grounded single-shot chat with [n] citations into the abstract.
  const sendViaLegacy = async (history: ReaderMessage[]) => {
    setLegacyStreaming(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: paper.id,
          messages: history.map(m => ({ role: m.role, content: m.content })),
          paperContext: paperContext(),
          sources: sources.map(s => s.text),
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
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              fullText += parsed.text
              patchLastAssistant(msg => ({ ...msg, content: fullText }))
            }
          } catch {}
        }
      }
    } catch {
      patchLastAssistant(msg => ({ ...msg, content: 'Sorry, I encountered an error. Please try again.' }))
    } finally {
      setLegacyStreaming(false)
    }
  }

  const sendMessage = (question?: string) => {
    const content = (question ?? input).trim()
    if (!content || streaming) return

    setSelection(null)
    setRightTab('chat')
    const history: ReaderMessage[] = [...messages, { role: 'user', content }]
    setMessages([...history, { role: 'assistant', content: '', toolEvents: [], sources: [] }])
    setInput('')

    if (isLoggedIn) sendViaAgent(content)
    else sendViaLegacy(history)
  }

  // ---- Citation -> highlight source in the document ----
  const jumpToSource = useCallback((n: number) => {
    const wasText = docView === 'text'
    if (!wasText) setDocView('text')
    setActiveCite(n)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    // If we just switched from the PDF view, give the text DOM a moment to mount.
    setTimeout(() => {
      const el = document.getElementById(`src-${n}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, wasText ? 0 : 80)
    flashTimer.current = setTimeout(() => setActiveCite(null), 2600)
  }, [docView])

  // ---- Highlight-to-ask ----
  const handleSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) { setSelection(null); return }
    const text = sel.toString().trim()
    if (text.length < 4) { setSelection(null); return }
    const range = sel.getRangeAt(0)
    if (!docTextRef.current?.contains(range.commonAncestorContainer)) { setSelection(null); return }
    const rect = range.getBoundingClientRect()
    setSelection({ text: text.slice(0, 600), top: rect.top, left: rect.left + rect.width / 2 })
  }, [])

  useEffect(() => {
    if (!selection) return
    const clear = () => setSelection(null)
    window.addEventListener('scroll', clear, true)
    window.addEventListener('resize', clear)
    return () => {
      window.removeEventListener('scroll', clear, true)
      window.removeEventListener('resize', clear)
    }
  }, [selection])

  const askAboutSelection = (mode: 'explain' | 'ask') => {
    if (!selection) return
    const quote = selection.text
    if (mode === 'explain') {
      sendMessage(`Explain this passage from the paper in plain terms:\n\n"${quote}"`)
    } else {
      setRightTab('chat')
      const short = quote.length > 140 ? quote.slice(0, 140) + '…' : quote
      setInput(`Regarding "${short}" — `)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }

  // ---- Study tools ----
  const loadStudy = useCallback(async () => {
    if (study || studyLoading) return
    setStudyLoading(true)
    setStudyError(null)
    try {
      const res = await fetch('/api/ai/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: paper.title, abstract: paper.abstract, tldr: paper.tldr }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate study tools.')
      }
      setStudy(await res.json())
    } catch (e: any) {
      setStudyError(e?.message || 'Failed to generate study tools.')
    } finally {
      setStudyLoading(false)
    }
  }, [study, studyLoading, paper])

  const openStudy = () => {
    setRightTab('study')
    loadStudy()
  }

  const toggleCard = (i: number) => {
    setFlipped(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const authors = Array.isArray(paper.authors) ? paper.authors : []

  return (
    <div className="lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden flex flex-col bg-[#0a0a0a]">
      {/* Top bar */}
      <div className="shrink-0 border-b border-white/8 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 h-12">
          <Link
            href={`/papers/${paper.id}`}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to paper</span>
          </Link>
          <div className="h-4 w-px bg-white/10 shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0">
            <BookOpen className="w-3.5 h-3.5 text-[#F5A3FF] shrink-0" />
            <span className="text-xs font-mono text-zinc-300 truncate">{paper.title}</span>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {pdfUrl && (
              <div className="hidden sm:flex items-center bg-white/[0.04] rounded-md border border-white/8 p-0.5">
                {(['text', 'pdf'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setDocView(v)}
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-mono rounded transition-all',
                      docView === v ? 'bg-[#F5A3FF]/15 text-[#F5A3FF]' : 'text-zinc-600 hover:text-zinc-400'
                    )}
                  >
                    {v === 'text' ? 'Text' : 'PDF'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Split body */}
      <div className="flex-1 flex flex-col lg:flex-row lg:min-h-0">
        {/* Document panel */}
        <div className="lg:w-1/2 lg:overflow-y-auto border-b lg:border-b-0 lg:border-r border-white/8">
          {docView === 'pdf' && pdfUrl ? (
            <iframe src={pdfUrl} title="Paper PDF" className="w-full h-[70vh] lg:h-full bg-white" />
          ) : (
            <div ref={docTextRef} onMouseUp={handleSelection} className="px-6 sm:px-10 py-8 max-w-2xl mx-auto">
              <h1 className="font-mono text-xl sm:text-2xl font-bold text-white leading-tight mb-3">
                {paper.title}
              </h1>
              {authors.length > 0 && (
                <p className="text-sm text-zinc-400 mb-6">
                  {authors.map(a => a.name).join(', ')}
                </p>
              )}

              {paper.tldr && (
                <div className="mb-6 bg-[#F5A3FF]/[0.04] border border-[#F5A3FF]/15 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-3 h-3 text-[#F5A3FF]" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#F5A3FF]/80">TL;DR</span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{paper.tldr}</p>
                </div>
              )}

              <h2 className="text-[11px] font-mono text-zinc-600 uppercase tracking-widest mb-3">Abstract</h2>
              <p className="text-[15px] text-zinc-300 leading-[1.75] selection:bg-[#F5A3FF]/25">
                {sources.map(s => (
                  <span
                    key={s.id}
                    id={`src-${s.id}`}
                    className={cn(
                      'transition-colors duration-500 rounded',
                      activeCite === s.id
                        ? 'bg-[#F5A3FF]/20 text-white ring-1 ring-[#F5A3FF]/30 px-0.5 -mx-0.5'
                        : 'bg-transparent'
                    )}
                  >
                    {s.text}{' '}
                  </span>
                ))}
              </p>

              <p className="mt-8 text-[11px] text-zinc-700 font-mono flex items-center gap-1.5">
                <WandSparkles className="w-3 h-3" />
                Select any text to ask the AI about it
              </p>
            </div>
          )}
        </div>

        {/* AI panel */}
        <div className="lg:w-1/2 flex flex-col lg:min-h-0 bg-[#0d0d0d]">
          {/* Tabs */}
          <div className="shrink-0 flex items-center gap-1 px-3 pt-3 pb-2 border-b border-white/8">
            <TabButton active={rightTab === 'chat'} onClick={() => setRightTab('chat')} icon={<MessageSquare className="w-3.5 h-3.5" />} label="Chat" />
            <TabButton active={rightTab === 'study'} onClick={openStudy} icon={<GraduationCap className="w-3.5 h-3.5" />} label="Study" />
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-[10px] font-mono text-zinc-600 hover:text-zinc-300 transition-colors px-2"
              >
                <ExternalLink className="w-3 h-3" /> PDF
              </a>
            )}
          </div>

          {rightTab === 'chat' ? (
            <ChatPanel
              messages={messages}
              streaming={streaming}
              isLoggedIn={isLoggedIn}
              input={input}
              setInput={setInput}
              onSend={sendMessage}
              onCite={jumpToSource}
              activeCite={activeCite}
              maxCitation={sources.length}
              inputRef={inputRef}
              messagesEndRef={messagesEndRef}
            />
          ) : (
            <StudyPanel
              study={study}
              loading={studyLoading}
              error={studyError}
              onRetry={() => { setStudy(null); setStudyError(null); loadStudy() }}
              flipped={flipped}
              toggleCard={toggleCard}
            />
          )}
        </div>
      </div>

      {/* Highlight-to-ask floating toolbar */}
      {selection && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ top: selection.top - 8, left: selection.left }}
        >
          <div className="flex items-center gap-0.5 bg-[#161616] border border-white/12 rounded-lg shadow-xl shadow-black/50 p-1">
            <button
              onClick={() => askAboutSelection('explain')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-200 hover:bg-[#F5A3FF]/15 hover:text-[#F5A3FF] transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Explain
            </button>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={() => askAboutSelection('ask')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-200 hover:bg-[#F5A3FF]/15 hover:text-[#F5A3FF] transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Ask AI
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-all',
        active ? 'bg-[#F5A3FF]/15 text-[#F5A3FF]' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
      )}
    >
      {icon} {label}
    </button>
  )
}

function ChatPanel({
  messages, streaming, isLoggedIn, input, setInput, onSend, onCite, activeCite, maxCitation, inputRef, messagesEndRef,
}: {
  messages: ReaderMessage[]
  streaming: boolean
  isLoggedIn: boolean
  input: string
  setInput: (v: string) => void
  onSend: (q?: string) => void
  onCite: (n: number) => void
  activeCite: number | null
  maxCitation: number
  inputRef: React.RefObject<HTMLInputElement>
  messagesEndRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <>
      <div className="flex-1 lg:overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4 justify-center text-zinc-600">
              <Cpu className="w-4 h-4 text-[#F5A3FF]" />
              <span className="text-xs font-mono">
                {isLoggedIn ? 'Agent · searches the literature as it answers' : 'Ask anything — answers cite the abstract'}
              </span>
            </div>
            <div className="grid gap-1.5 max-w-md mx-auto w-full">
              {SUGGESTED.map(q => (
                <button
                  key={q}
                  onClick={() => onSend(q)}
                  className="text-left text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 rounded-lg px-3 py-2 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('text-sm leading-relaxed', msg.role === 'user' ? 'flex justify-end' : '')}>
                {msg.role === 'user' ? (
                  <div className="bg-[#F5A3FF]/10 border border-[#F5A3FF]/15 text-zinc-200 rounded-2xl rounded-br-sm px-3.5 py-2 max-w-[85%] whitespace-pre-wrap">
                    {msg.content}
                  </div>
                ) : (
                  <div className="text-zinc-300 pr-2">
                    {isLoggedIn ? (
                      <>
                        {msg.reasoning && !msg.content && (
                          <details className="mb-1.5 text-[11px]">
                            <summary className="cursor-pointer font-mono text-zinc-500 hover:text-zinc-300">
                              {streaming && i === messages.length - 1 ? 'Thinking…' : 'Reasoning'}
                            </summary>
                            <div className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap text-zinc-600 leading-relaxed">
                              {msg.reasoning}
                            </div>
                          </details>
                        )}
                        {msg.toolEvents && msg.toolEvents.length > 0 && (
                          <ToolActivity events={msg.toolEvents} compact />
                        )}
                        {msg.content ? (
                          <Markdown content={msg.content} />
                        ) : streaming && i === messages.length - 1 && !msg.reasoning ? (
                          <LoaderDots label="Thinking…" />
                        ) : null}
                        {msg.sources && msg.sources.length > 0 && (
                          <SourceList sources={msg.sources} limit={4} />
                        )}
                      </>
                    ) : (
                      <>
                        <CitedText text={msg.content} maxCitation={maxCitation} onCite={onCite} activeCitation={activeCite} />
                        {streaming && i === messages.length - 1 && (
                          <span className="inline-block w-1 h-3.5 bg-[#F5A3FF] ml-0.5 align-middle animate-pulse" />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/8 p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
            placeholder="Ask about this paper…"
            disabled={streaming}
            className="flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-[#F5A3FF]/30 disabled:opacity-50"
          />
          <button
            onClick={() => onSend()}
            disabled={!input.trim() || streaming}
            className="px-3 bg-[#F5A3FF]/10 hover:bg-[#F5A3FF]/20 border border-[#F5A3FF]/20 rounded-lg text-[#F5A3FF] disabled:opacity-30 transition-all"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </>
  )
}

function StudyPanel({
  study, loading, error, onRetry, flipped, toggleCard,
}: {
  study: StudyTools | null
  loading: boolean
  error: string | null
  onRetry: () => void
  flipped: Set<number>
  toggleCard: (i: number) => void
}) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Loader2 className="w-4 h-4 animate-spin text-[#F5A3FF]" />
          Generating study tools…
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500 px-6 text-center">
        <span className="text-xs font-mono leading-relaxed max-w-xs">{error}</span>
        <button onClick={onRetry} className="flex items-center gap-1.5 text-xs text-[#F5A3FF] hover:underline">
          <RotateCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    )
  }
  if (!study) return null

  return (
    <div className="flex-1 lg:overflow-y-auto px-4 py-4 space-y-6">
      {/* Key takeaways */}
      {study.takeaways.length > 0 && (
        <section>
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-2.5">Key takeaways</h3>
          <ul className="space-y-2">
            {study.takeaways.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-zinc-300 leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#F5A3FF] shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Glossary */}
      {study.glossary.length > 0 && (
        <section>
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-2.5">Glossary</h3>
          <div className="space-y-2">
            {study.glossary.map((g, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2.5">
                <div className="text-sm font-medium text-[#F5A3FF]/90 mb-0.5">{g.term}</div>
                <div className="text-xs text-zinc-400 leading-relaxed">{g.definition}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Flashcards */}
      {study.flashcards.length > 0 && (
        <section>
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mb-2.5">
            Flashcards <span className="text-zinc-700 normal-case">· tap to reveal</span>
          </h3>
          <div className="space-y-2">
            {study.flashcards.map((c, i) => (
              <button
                key={i}
                onClick={() => toggleCard(i)}
                className="w-full text-left bg-white/[0.03] hover:bg-white/[0.05] border border-white/8 rounded-lg px-3 py-3 transition-all"
              >
                <div className="text-sm text-zinc-200">{c.question}</div>
                {flipped.has(i) ? (
                  <div className="mt-2 pt-2 border-t border-white/8 text-xs text-zinc-400 leading-relaxed">{c.answer}</div>
                ) : (
                  <div className="mt-1 text-[10px] font-mono text-zinc-600">tap to reveal answer</div>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="text-[10px] text-zinc-700 font-mono pt-1">generated by AI · may contain errors</p>
    </div>
  )
}
