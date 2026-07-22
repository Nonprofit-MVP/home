// The agent loop: stream a model turn, execute any tool calls, feed results
// back, repeat until the model answers or the budget runs out. Structure and
// constants ported from exemplar's runDeterministicToolLoop, but using native
// function calling instead of exemplar's JSON-extraction machinery.
import { streamOpenAICompatible, type AgentProvider, type OAIMessage, type OAITool, type OAIToolCall, type StreamCallResult } from './providers'
import { streamAnthropic } from './anthropic-provider'
import { executeTool, extractSources, type AgentSource } from './tools'
import type { InternalToolContext } from './internal-tools'
import { safeJsonStringify, truncateMiddle, errorMessage, MAX_TOOL_RESULT_CHARS } from './util'

// Budgets are generous because the default models are reasoning models
// (gpt-oss-120b) that spend real time thinking before the final answer — a
// tight timeout cut them off mid-thought and left tool results with no reply.
export const RUNTIME_BUDGET_MS = 40_000
export const MAX_TOOL_ITERATIONS = 10
const FORCE_FINAL_THRESHOLD_MS = 10_000
const MAX_SOURCES_PER_TURN = 12

export interface ToolTraceEntry {
  name: string
  args: Record<string, unknown>
  ok: boolean
  ms: number
}

export interface AgentLoopResult {
  reply: string
  toolTrace: ToolTraceEntry[]
  sources: AgentSource[]
  stopReason: string
}

export interface AgentLoopOpts {
  provider: AgentProvider
  model: string
  systemPrompt: string
  transcript: OAIMessage[]
  tools: OAITool[]
  toolContext: InternalToolContext
  emit: (event: Record<string, unknown>) => void
}

function parseArgs(call: OAIToolCall): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(call.function.arguments || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return null
  }
}

export async function runAgentLoop(opts: AgentLoopOpts): Promise<AgentLoopResult> {
  const { provider, model, systemPrompt, transcript, tools, toolContext, emit } = opts

  const messages: OAIMessage[] = [{ role: 'system', content: systemPrompt }, ...transcript]
  const toolTrace: ToolTraceEntry[] = []
  const sources: AgentSource[] = []
  const seenSources = new Set<string>()
  const startedAt = Date.now()
  const maxIterations = Math.min(MAX_TOOL_ITERATIONS, provider.maxIterations ?? MAX_TOOL_ITERATIONS)
  const streamCall = provider.kind === 'anthropic' ? streamAnthropic : streamOpenAICompatible

  let reply = ''
  let lastReasoning = ''
  let stopReason = 'final'

  // If the model produced only chain-of-thought and no final prose (common
  // when a reasoning model is cut off), fall back to its reasoning so the user
  // always sees an answer rather than bare sources.
  const finalReply = () => {
    if (reply.trim()) return reply
    if (lastReasoning.trim()) return lastReasoning.trim()
    return "I gathered the sources below but couldn't compose a written answer — try rephrasing, or switch the provider in the top-right."
  }

  const collectSources = (toolName: string, result: unknown) => {
    for (const source of extractSources(toolName, result)) {
      const key = (source.doi || source.url || source.title).toLowerCase()
      if (seenSources.has(key) || sources.length >= MAX_SOURCES_PER_TURN) continue
      seenSources.add(key)
      sources.push(source)
    }
  }

  for (let iteration = 0; iteration <= maxIterations; iteration += 1) {
    const remainingMs = RUNTIME_BUDGET_MS - (Date.now() - startedAt)
    const forceFinal = iteration === maxIterations || remainingMs < FORCE_FINAL_THRESHOLD_MS

    if (forceFinal && iteration > 0) {
      messages.push({
        role: 'user',
        content:
          'Answer now using only the information gathered above. If something could not be verified, say so explicitly.',
      })
      stopReason = iteration === maxIterations ? 'max_iterations' : 'runtime_budget_exceeded'
    }

    let result: StreamCallResult
    try {
      result = await streamCall({
        provider,
        model,
        messages,
        tools,
        toolChoice: forceFinal ? 'none' : 'auto',
        maxTokens: 2048,
        remainingMs: Math.max(remainingMs, 0),
        onToken: text => emit({ type: 'token', text }),
        onReasoning: text => emit({ type: 'reasoning', text }),
      })
    } catch (err) {
      if (reply || lastReasoning) {
        // We already streamed a partial answer/reasoning; keep it.
        return { reply: finalReply(), toolTrace, sources, stopReason: 'model_error_after_partial' }
      }
      throw err
    }

    if (result.content) reply = result.content
    if (result.reasoning) lastReasoning = result.reasoning

    if (!result.toolCalls.length || forceFinal) {
      return { reply: finalReply(), toolTrace, sources, stopReason }
    }

    messages.push({
      role: 'assistant',
      content: result.content || null,
      tool_calls: result.toolCalls,
    })

    // This turn only prepared tool calls — its streamed prose (and any harmony
    // role markers a reasoning model leaks, e.g. gpt-oss's "assistant") is not
    // the answer. Tell the client to drop it so the next turn starts clean; the
    // accumulated tool activity and sources are kept.
    emit({ type: 'reset' })

    const toolResults = await Promise.all(
      result.toolCalls.map(async (call): Promise<OAIMessage> => {
        const args = parseArgs(call)
        emit({ type: 'tool', id: call.id, name: call.function.name, args: args ?? undefined, status: 'running' })
        const toolStart = Date.now()
        let output: unknown
        let ok = true
        if (args === null) {
          output = { ok: false, error: 'Malformed tool arguments (invalid JSON). Retry with valid JSON.' }
          ok = false
        } else {
          try {
            output = await executeTool(call.function.name, args as Record<string, any>, toolContext)
            ok = !(output && typeof output === 'object' && (output as any).ok === false)
          } catch (err) {
            output = { ok: false, error: errorMessage(err) }
            ok = false
          }
        }
        const ms = Date.now() - toolStart
        emit({ type: 'tool', id: call.id, name: call.function.name, status: 'done', ok, ms })
        toolTrace.push({ name: call.function.name, args: args ?? {}, ok, ms })
        if (ok) collectSources(call.function.name, output)
        return {
          role: 'tool',
          tool_call_id: call.id,
          content: truncateMiddle(safeJsonStringify(output), MAX_TOOL_RESULT_CHARS).text,
        }
      })
    )

    messages.push(...toolResults)
  }

  return { reply: finalReply(), toolTrace, sources, stopReason }
}
