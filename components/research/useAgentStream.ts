'use client'

import { useCallback, useRef, useState } from 'react'
import type { AgentStreamEvent } from '@/types'

export interface AgentChatRequest {
  conversationId?: string
  message: string
  provider?: string
  model?: string
  context?: { type: 'paper'; paperId: string; paperContext: string }
}

export interface AgentStreamHandlers {
  onEvent: (event: AgentStreamEvent) => void
}

// Shared SSE reader for the agent chat endpoint — same data:-line parsing the
// legacy AISidebar chat uses, extended to the agent's typed event protocol.
export function useAgentStream() {
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const sendMessage = useCallback(
    async (body: AgentChatRequest, { onEvent }: AgentStreamHandlers) => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setStreaming(true)

      try {
        const res = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          onEvent({ type: 'error', message: data?.error || `Request failed (${res.status})` })
          return
        }
        if (!res.body) {
          onEvent({ type: 'error', message: 'No response stream' })
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (!data || data === '[DONE]') continue
            try {
              onEvent(JSON.parse(data) as AgentStreamEvent)
            } catch {
              // Skip malformed frames.
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          onEvent({ type: 'error', message: err?.message || 'Stream failed' })
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        setStreaming(false)
      }
    },
    []
  )

  return { sendMessage, streaming, abort }
}
