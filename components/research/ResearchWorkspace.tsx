'use client'

import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { ConversationList } from './ConversationList'
import { ChatPanel } from './ChatPanel'
import { useAgentStream } from './useAgentStream'
import type { UIMessage } from './MessageBubble'
import type { AgentConversation, AgentMessage, AgentToolEvent } from '@/types'

interface ResearchWorkspaceProps {
  initialConversations: AgentConversation[]
}

export function ResearchWorkspace({ initialConversations }: ResearchWorkspaceProps) {
  const [conversations, setConversations] = useState<AgentConversation[]>(initialConversations)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [provider, setProvider] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { sendMessage, streaming, abort } = useAgentStream()

  // Turn the page into a fixed app-shell: no window scroll and no global
  // footer while the workspace is open — only the message list scrolls.
  useEffect(() => {
    document.body.classList.add('research-shell')
    return () => document.body.classList.remove('research-shell')
  }, [])

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/conversations')
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch {}
  }, [])

  const selectConversation = useCallback(async (id: string) => {
    abort()
    setActiveId(id)
    setSidebarOpen(false)
    setLoadingConversation(true)
    setMessages([])
    try {
      const res = await fetch(`/api/agent/conversations/${id}`)
      if (!res.ok) return
      const data = await res.json()
      const loaded: UIMessage[] = (data.messages || []).map((m: AgentMessage) => ({
        role: m.role,
        content: m.content,
        toolEvents: (m.tool_calls || []).map((t, i) => ({
          id: `saved_${i}`,
          name: t.name,
          status: 'done' as const,
          ok: t.ok,
          ms: t.ms,
        })),
        sources: m.sources || [],
      }))
      setMessages(loaded)
    } finally {
      setLoadingConversation(false)
    }
  }, [abort])

  const newConversation = useCallback(() => {
    abort()
    setActiveId(null)
    setMessages([])
    setSidebarOpen(false)
  }, [abort])

  const handleSend = useCallback(
    (content: string) => {
      const userMessage: UIMessage = { role: 'user', content }
      const assistantMessage: UIMessage = { role: 'assistant', content: '', toolEvents: [], sources: [] }
      setMessages(prev => [...prev, userMessage, assistantMessage])

      const patchAssistant = (patch: (msg: UIMessage) => UIMessage) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = patch(last)
          }
          return updated
        })
      }

      sendMessage(
        {
          conversationId: activeId ?? undefined,
          message: content,
          provider: provider ?? undefined,
        },
        {
          onEvent: event => {
            switch (event.type) {
              case 'meta':
                if (!activeId) {
                  setActiveId(event.conversationId)
                  refreshConversations()
                }
                break
              case 'token':
                patchAssistant(msg => ({ ...msg, content: msg.content + event.text }))
                break
              case 'reasoning':
                patchAssistant(msg => ({ ...msg, reasoning: (msg.reasoning || '') + event.text }))
                break
              case 'reset':
                patchAssistant(msg => ({ ...msg, content: '', reasoning: '' }))
                break
              case 'tool':
                patchAssistant(msg => {
                  const events: AgentToolEvent[] = [...(msg.toolEvents || [])]
                  const existing = events.findIndex(e => e.id === event.id && e.name === event.name)
                  const entry: AgentToolEvent = {
                    id: event.id,
                    name: event.name,
                    args: event.args,
                    status: event.status,
                    ok: event.ok,
                    ms: event.ms,
                  }
                  if (existing >= 0) events[existing] = { ...events[existing], ...entry }
                  else events.push(entry)
                  return { ...msg, toolEvents: events }
                })
                break
              case 'sources':
                patchAssistant(msg => ({ ...msg, sources: event.sources }))
                break
              case 'done':
                refreshConversations()
                break
              case 'error':
                patchAssistant(msg => ({
                  ...msg,
                  error: event.message,
                  content: msg.content || '',
                }))
                break
            }
          },
        }
      )
    },
    [activeId, provider, sendMessage, refreshConversations]
  )

  const handleRename = useCallback(async (id: string, title: string) => {
    setConversations(prev => prev.map(c => (c.id === id ? { ...c, title } : c)))
    await fetch(`/api/agent/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).catch(() => {})
  }, [])

  const handleDelete = useCallback(
    async (id: string) => {
      setConversations(prev => prev.filter(c => c.id !== id))
      if (activeId === id) {
        setActiveId(null)
        setMessages([])
      }
      await fetch(`/api/agent/conversations/${id}`, { method: 'DELETE' }).catch(() => {})
    },
    [activeId]
  )

  const sidebar = (
    <ConversationList
      conversations={conversations}
      activeId={activeId}
      onSelect={selectConversation}
      onNew={newConversation}
      onRename={handleRename}
      onDelete={handleDelete}
    />
  )

  return (
    <div className="h-[calc(100vh-3.5rem)] max-w-7xl mx-auto md:grid md:grid-cols-[280px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col border-r border-white/8 min-h-0">{sidebar}</aside>

      {/* Mobile slide-over */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-[#0d0d0d] border-r border-white/8 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 h-12 border-b border-white/8 shrink-0">
              <span className="text-xs font-mono font-medium text-zinc-300">Conversations</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">{sidebar}</div>
          </div>
        </div>
      )}

      {/* Chat */}
      <main className="h-full min-h-0">
        <ChatPanel
          messages={messages}
          streaming={streaming}
          loading={loadingConversation}
          provider={provider}
          onProviderChange={setProvider}
          onSend={handleSend}
          onAbort={abort}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      </main>
    </div>
  )
}
