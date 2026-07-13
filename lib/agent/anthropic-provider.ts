// Adapter that gives the Anthropic SDK the same call signature as
// streamOpenAICompatible, so the agent loop treats Claude as just another
// provider. Converts OpenAI-shaped messages/tools to Anthropic's format.
import Anthropic from '@anthropic-ai/sdk'
import type { OAIMessage, OAIToolCall, StreamCallOpts, StreamCallResult } from './providers'

let client: Anthropic | null = null
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  }
  return client
}

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string }

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

function convertMessages(messages: OAIMessage[]): { system: string; converted: AnthropicMessage[] } {
  let system = ''
  const converted: AnthropicMessage[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      system = system ? `${system}\n\n${msg.content}` : msg.content
      continue
    }
    if (msg.role === 'user') {
      converted.push({ role: 'user', content: msg.content })
      continue
    }
    if (msg.role === 'assistant') {
      const blocks: AnthropicContentBlock[] = []
      if (msg.content) blocks.push({ type: 'text', text: msg.content })
      for (const tc of msg.tool_calls || []) {
        let input: unknown = {}
        try {
          input = JSON.parse(tc.function.arguments || '{}')
        } catch {
          input = { _raw: tc.function.arguments }
        }
        blocks.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input })
      }
      converted.push({ role: 'assistant', content: blocks.length ? blocks : '' })
      continue
    }
    if (msg.role === 'tool') {
      // Anthropic requires every tool_result for one assistant turn in a
      // SINGLE user message — merge consecutive tool results together.
      const last = converted[converted.length - 1]
      const block: AnthropicContentBlock = {
        type: 'tool_result',
        tool_use_id: msg.tool_call_id,
        content: msg.content,
      }
      if (
        last &&
        last.role === 'user' &&
        Array.isArray(last.content) &&
        last.content.every(b => b.type === 'tool_result')
      ) {
        last.content.push(block)
      } else {
        converted.push({ role: 'user', content: [block] })
      }
    }
  }

  return { system, converted }
}

export async function streamAnthropic(opts: StreamCallOpts): Promise<StreamCallResult> {
  const { model, messages, tools, toolChoice = 'auto', maxTokens = 2048, onToken } = opts
  const { system, converted } = convertMessages(messages)

  const anthropicTools = (tools || []).map(t => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters as any,
  }))

  // NOTE: no temperature/top_p — recent Claude models (Opus 4.8+) reject them.
  const stream = getClient().messages.stream({
    model,
    max_tokens: maxTokens,
    system: system || undefined,
    messages: converted as any,
    ...(anthropicTools.length
      ? {
          tools: anthropicTools as any,
          tool_choice: (toolChoice === 'none' ? { type: 'none' } : { type: 'auto' }) as any,
        }
      : {}),
  })

  stream.on('text', text => onToken(text))

  const final = await stream.finalMessage()

  let content = ''
  const toolCalls: OAIToolCall[] = []
  for (const block of final.content) {
    if (block.type === 'text') content += block.text
    if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        type: 'function',
        function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) },
      })
    }
  }

  return { content, reasoning: '', toolCalls, finishReason: final.stop_reason }
}
