// Env-key-gated registry of agent LLM providers, plus the fetch-based
// streaming caller shared by every OpenAI-compatible endpoint. Ported from
// exemplar's per-provider Netlify functions, unified: Groq, Cerebras,
// OpenRouter, Deepseek, and Gemini all speak the OpenAI chat-completions
// protocol, so one caller serves all five. Anthropic (already a Journality
// dependency) gets a thin adapter in anthropic-provider.ts.

export const MODEL_CALL_TIMEOUT_MS = 30_000

export type ProviderId = 'cerebras' | 'openrouter' | 'deepseek' | 'gemini' | 'anthropic'

export interface AgentProvider {
  id: ProviderId
  label: string
  kind: 'openai' | 'anthropic'
  chatUrl?: string
  envKey: string
  defaultModel: string
  modelEnvKey: string
  extraHeaders?: () => Record<string, string>
  // Per-provider iteration cap (Cerebras allows ~5 req/min per account, so its
  // loop budget is tighter — same lesson as exemplar's ITERATIONS_PER_KEY).
  maxIterations?: number
}

export const PROVIDERS: AgentProvider[] = [
  {
    id: 'cerebras',
    label: 'Cerebras',
    kind: 'openai',
    chatUrl: 'https://api.cerebras.ai/v1/chat/completions',
    envKey: 'CEREBRAS_API_KEY',
    defaultModel: 'gpt-oss-120b',
    modelEnvKey: 'AGENT_CEREBRAS_MODEL',
    maxIterations: 4,
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    kind: 'openai',
    chatUrl: 'https://openrouter.ai/api/v1/chat/completions',
    envKey: 'OPENROUTER_API_KEY',
    defaultModel: 'openai/gpt-oss-120b',
    modelEnvKey: 'AGENT_OPENROUTER_MODEL',
    extraHeaders: () => ({
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'Journality',
    }),
  },
  {
    id: 'deepseek',
    label: 'Deepseek',
    kind: 'openai',
    chatUrl: 'https://api.deepseek.com/chat/completions',
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    modelEnvKey: 'AGENT_DEEPSEEK_MODEL',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    kind: 'openai',
    chatUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-2.5-flash',
    modelEnvKey: 'AGENT_GEMINI_MODEL',
  },
  {
    id: 'anthropic',
    label: 'Claude',
    kind: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-opus-4-8',
    modelEnvKey: 'AGENT_ANTHROPIC_MODEL',
  },
]

// A provider counts as configured only if its key is a real value — not blank
// and not a leftover placeholder like "your_anthropic_api_key_here" or "sk-ant-...".
export function keyConfigured(name: string): boolean {
  const value = process.env[name]?.trim()
  if (!value) return false
  if (/^(your_|changeme|placeholder|replace|example|xxx|test_key)/i.test(value)) return false
  if (/_here$/i.test(value)) return false
  if (value.endsWith('...')) return false
  return true
}

export function availableProviders(): AgentProvider[] {
  return PROVIDERS.filter(p => keyConfigured(p.envKey))
}

export function resolveProvider(id?: string): AgentProvider | null {
  const available = availableProviders()
  if (!available.length) return null
  if (id) return available.find(p => p.id === id) || null
  const preferred = process.env.AGENT_DEFAULT_PROVIDER
  if (preferred) {
    const match = available.find(p => p.id === preferred)
    if (match) return match
  }
  return available[0]
}

export function modelFor(provider: AgentProvider, requested?: string): string {
  if (requested && typeof requested === 'string') return requested
  return process.env[provider.modelEnvKey]?.trim() || provider.defaultModel
}

// ---- OpenAI-compatible wire shapes -------------------------------------

export interface OAIToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export type OAIMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OAIToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export interface OAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface StreamCallResult {
  content: string
  reasoning: string
  toolCalls: OAIToolCall[]
  finishReason: string | null
}

export interface StreamCallOpts {
  provider: AgentProvider
  model: string
  messages: OAIMessage[]
  tools?: OAITool[]
  toolChoice?: 'auto' | 'none'
  maxTokens?: number
  onToken: (text: string) => void
  onReasoning?: (text: string) => void
  remainingMs?: number
}

// ---- The shared streaming caller ----------------------------------------

export async function streamOpenAICompatible(opts: StreamCallOpts): Promise<StreamCallResult> {
  const { provider, model, messages, tools, toolChoice = 'auto', maxTokens = 2048, onToken, onReasoning } = opts
  const apiKey = process.env[provider.envKey]?.trim()
  if (!apiKey || !provider.chatUrl) {
    throw new Error(`Provider ${provider.id} is not configured`)
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.2,
    stream: true,
  }
  if (tools?.length && toolChoice !== 'none') {
    body.tools = tools
    body.tool_choice = toolChoice
  }

  const doFetch = async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), MODEL_CALL_TIMEOUT_MS)
    try {
      return await fetch(provider.chatUrl!, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...(provider.extraHeaders ? provider.extraHeaders() : {}),
        },
        body: JSON.stringify(body),
      })
    } finally {
      clearTimeout(timer)
    }
  }

  let res: Response
  try {
    res = await doFetch()
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(`${provider.label} model call timed out after ${MODEL_CALL_TIMEOUT_MS}ms`)
    }
    throw err
  }

  // One paced retry on a rate limit when it fits the caller's remaining budget.
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const waitMs = Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000, 5000)
    if ((opts.remainingMs ?? 0) > waitMs + 3000) {
      await new Promise(r => setTimeout(r, waitMs))
      res = await doFetch()
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${provider.label} responded ${res.status}: ${text.slice(0, 300)}`)
  }
  if (!res.body) {
    throw new Error(`${provider.label} returned an empty response body`)
  }

  // Accumulate streamed tool calls by index — providers may split a call's
  // function.arguments across many chunks, or send whole calls in one chunk.
  // Gemini's compat endpoint sometimes omits ids (synthesize) and can report
  // finish_reason "stop" with tool calls present (trust the accumulator).
  const toolCallsByIndex = new Map<number, OAIToolCall>()
  let content = ''
  let reasoning = ''
  let finishReason: string | null = null

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      let parsed: any
      try {
        parsed = JSON.parse(payload)
      } catch {
        continue
      }
      const choice = parsed?.choices?.[0]
      if (!choice) continue
      if (choice.finish_reason) finishReason = choice.finish_reason
      const delta = choice.delta || {}
      if (typeof delta.content === 'string' && delta.content) {
        content += delta.content
        onToken(delta.content)
      }
      // Reasoning models (gpt-oss, deepseek-reasoner, etc.) stream their
      // chain-of-thought in a separate field — surface it instead of dropping it.
      const reasoningChunk =
        typeof delta.reasoning === 'string'
          ? delta.reasoning
          : typeof delta.reasoning_content === 'string'
            ? delta.reasoning_content
            : ''
      if (reasoningChunk) {
        reasoning += reasoningChunk
        onReasoning?.(reasoningChunk)
      }
      if (Array.isArray(delta.tool_calls)) {
        for (const tc of delta.tool_calls) {
          const index = typeof tc.index === 'number' ? tc.index : 0
          let entry = toolCallsByIndex.get(index)
          if (!entry) {
            entry = {
              id: tc.id || `call_${index}`,
              type: 'function',
              function: { name: '', arguments: '' },
            }
            toolCallsByIndex.set(index, entry)
          }
          if (tc.id) entry.id = tc.id
          if (tc.function?.name) entry.function.name += tc.function.name
          if (tc.function?.arguments) entry.function.arguments += tc.function.arguments
        }
      }
    }
  }

  const toolCalls = Array.from(toolCallsByIndex.values()).filter(tc => tc.function.name)
  return { content, reasoning, toolCalls, finishReason }
}
