import { anthropic, CLAUDE_MODEL, anthropicKeyStatus } from '@/lib/anthropic'
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

  const keyStatus = anthropicKeyStatus()

  const stream = new ReadableStream({
    async start(controller) {
      // Surface configuration problems as a normal assistant reply so the user
      // sees exactly what's wrong instead of a generic error.
      if (!keyStatus.ok) {
        const data = JSON.stringify({ text: `⚠️ ${keyStatus.message}` })
        controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
        return
      }
      try {
        const response = await anthropic.messages.stream({
          model: CLAUDE_MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        })

        for await (const chunk of response) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const data = JSON.stringify({ text: chunk.delta.text })
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
          }
        }

        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err: any) {
        const errData = JSON.stringify({ error: err.message })
        controller.enqueue(new TextEncoder().encode(`data: ${errData}\n\n`))
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
