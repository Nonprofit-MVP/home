import {
  resolveProvider,
  modelFor,
  streamOpenAICompatible,
  type OAIMessage,
} from '@/lib/agent/providers'
import { streamAnthropic } from '@/lib/agent/anthropic-provider'
import type { ChatMessage } from '@/types'

export async function POST(request: Request) {
  const { messages, paperContext, sources } = await request.json() as {
    paperId: string
    messages: ChatMessage[]
    paperContext: string
    sources?: string[]
  }

  const hasSources = Array.isArray(sources) && sources.length > 0
  const sourceBlock = hasSources
    ? `\n\nNumbered sources (from the paper's abstract):\n${sources
        .map((s, i) => `[${i + 1}] ${s}`)
        .join('\n')}`
    : ''

  const citationRules = hasSources
    ? `\n\nGrounding rules:
- When a claim is supported by a numbered source above, cite it inline with its bracket, e.g. "the model improves accuracy [2]". Cite multiple sources as [2][4] when relevant.
- Only use bracket numbers that appear in the numbered sources. Never invent a source number.
- Keep citations tight — cite the specific source that supports the specific claim, not everything.
- If the answer draws on general knowledge beyond the sources, answer normally without a bracket for that part.`
    : ''

  const systemPrompt = `You are an expert research assistant helping a user understand a specific paper. You have been given the paper's title, abstract, and TL;DR. Answer questions accurately and concisely. If asked about something not covered in the paper, say so clearly.

Paper context:
${paperContext}${sourceBlock}${citationRules}`

  // Guest paper chat uses the same provider architecture as the agent
  // (OpenRouter etc.), just single-shot with no tools — so it never depends on
  // the raw Anthropic SDK.
  const provider = resolveProvider()
  const model = provider ? modelFor(provider) : ''
  const streamCall = provider?.kind === 'anthropic' ? streamAnthropic : streamOpenAICompatible

  const oaiMessages: OAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ]

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      // Surface configuration problems as a normal assistant reply so the user
      // sees exactly what's wrong instead of a generic error.
      if (!provider) {
        const data = JSON.stringify({
          text: '⚠️ No AI provider is configured. Add an OpenRouter (or other) API key to .env and restart the dev server.',
        })
        controller.enqueue(enc.encode(`data: ${data}\n\n`))
        controller.enqueue(enc.encode('data: [DONE]\n\n'))
        controller.close()
        return
      }
      try {
        await streamCall({
          provider,
          model,
          messages: oaiMessages,
          toolChoice: 'none',
          maxTokens: 1024,
          onToken: text => controller.enqueue(enc.encode(`data: ${JSON.stringify({ text })}\n\n`)),
        })
        controller.enqueue(enc.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err: any) {
        const errData = JSON.stringify({ error: err.message })
        controller.enqueue(enc.encode(`data: ${errData}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
