import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import type { ChatMessage } from '@/types'

export async function POST(request: Request) {
  const { messages, paperContext } = await request.json() as {
    paperId: string
    messages: ChatMessage[]
    paperContext: string
  }

  const systemPrompt = `You are an expert research assistant helping a user understand a specific paper. You have been given the paper's title, abstract, and TL;DR. Answer questions accurately and concisely. If asked about something not covered in the paper, say so clearly.

Paper context:
${paperContext}`

  const stream = new ReadableStream({
    async start(controller) {
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
