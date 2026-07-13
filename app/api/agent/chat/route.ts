import { createServerSupabaseClient } from '@/lib/supabase'
import { resolveProvider, modelFor } from '@/lib/agent/providers'
import { buildAgentTools } from '@/lib/agent/tools'
import { buildSystemPrompt } from '@/lib/agent/prompts'
import { runAgentLoop, MAX_TOOL_ITERATIONS } from '@/lib/agent/loop'
import {
  getOrCreateConversation,
  insertUserMessage,
  insertAssistantMessage,
  loadTranscript,
  type ConversationContext,
} from '@/lib/agent/store'
import { errorMessage } from '@/lib/agent/util'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Reasoning models can take a while; the loop's own budget (~40s) is the real
// cap. Raise this if you deploy to a platform that enforces function duration.
export const maxDuration = 120

const MAX_MESSAGE_CHARS = 4000

interface ChatRequestBody {
  conversationId?: string
  message: string
  provider?: string
  model?: string
  context?: { type: 'paper'; paperId: string; paperContext: string }
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ChatRequestBody
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return Response.json({ error: 'message is required' }, { status: 400 })
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return Response.json({ error: `message exceeds ${MAX_MESSAGE_CHARS} characters` }, { status: 400 })
  }

  const provider = resolveProvider(body.provider)
  if (!provider) {
    return Response.json(
      { error: body.provider ? `Provider "${body.provider}" is not configured` : 'No agent provider is configured — set at least one provider API key' },
      { status: 400 }
    )
  }
  const model = modelFor(provider, body.model)

  const conversationContext: ConversationContext | undefined =
    body.context?.type === 'paper' && body.context.paperId
      ? { type: 'paper', paper_id: body.context.paperId }
      : undefined

  const convo = await getOrCreateConversation(supabase, {
    conversationId: body.conversationId,
    userId: user.id,
    title: message,
    context: conversationContext,
    provider: provider.id,
    model,
  })
  if ('error' in convo) {
    return Response.json({ error: convo.error }, { status: 404 })
  }
  const conversationId = convo.id

  // History BEFORE this turn's user message is inserted.
  const transcript = convo.created ? [] : await loadTranscript(supabase, conversationId)
  await insertUserMessage(supabase, conversationId, message)
  transcript.push({ role: 'user', content: message })

  const tools = buildAgentTools()
  const systemPrompt = buildSystemPrompt({
    paperContext: body.context?.paperContext,
    maxIterations: MAX_TOOL_ITERATIONS,
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // Client disconnected — keep running so the assistant message still persists.
        }
      }

      send({ type: 'meta', conversationId, provider: provider.id, model })

      try {
        const result = await runAgentLoop({
          provider,
          model,
          systemPrompt,
          transcript,
          tools,
          toolContext: { supabase },
          emit: send,
        })

        if (result.sources.length) {
          send({ type: 'sources', sources: result.sources })
        }

        // Persist BEFORE closing the stream — serverless platforms kill
        // execution as soon as the response finishes.
        const messageId = await insertAssistantMessage(supabase, {
          conversationId,
          content: result.reply,
          toolTrace: result.toolTrace,
          sources: result.sources,
          provider: provider.id,
          model,
        })

        send({ type: 'done', ok: true, messageId, stopReason: result.stopReason })
      } catch (err) {
        send({ type: 'error', message: errorMessage(err) })
      }

      try {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch {
        // Already closed.
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
