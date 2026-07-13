// Conversation/message persistence for the research agent. All queries run
// through the user-scoped (cookie) client so RLS enforces per-user access.
import type { AgentSupabase } from './internal-tools'
import type { OAIMessage } from './providers'
import type { AgentSource } from './tools'
import type { ToolTraceEntry } from './loop'

const HISTORY_LIMIT = 30

export interface ConversationContext {
  type?: 'paper'
  paper_id?: string
}

export async function getOrCreateConversation(
  supabase: AgentSupabase,
  {
    conversationId,
    userId,
    title,
    context,
    provider,
    model,
  }: {
    conversationId?: string
    userId: string
    title: string
    context?: ConversationContext
    provider: string
    model: string
  }
): Promise<{ id: string; created: boolean } | { error: string }> {
  if (conversationId) {
    const { data, error } = await supabase
      .from('agent_conversations')
      .select('id')
      .eq('id', conversationId)
      .single()
    if (error || !data) return { error: 'Conversation not found' }
    return { id: data.id, created: false }
  }

  const { data, error } = await supabase
    .from('agent_conversations')
    .insert({
      user_id: userId,
      title: title.slice(0, 80),
      context: context || {},
      provider,
      model,
    })
    .select('id')
    .single()
  if (error || !data) return { error: error?.message || 'Failed to create conversation' }
  return { id: data.id, created: true }
}

export async function insertUserMessage(
  supabase: AgentSupabase,
  conversationId: string,
  content: string
): Promise<void> {
  await supabase.from('agent_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content,
  })
}

export async function insertAssistantMessage(
  supabase: AgentSupabase,
  {
    conversationId,
    content,
    toolTrace,
    sources,
    provider,
    model,
  }: {
    conversationId: string
    content: string
    toolTrace: ToolTraceEntry[]
    sources: AgentSource[]
    provider: string
    model: string
  }
): Promise<string | null> {
  const { data } = await supabase
    .from('agent_messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      content,
      tool_calls: toolTrace,
      sources,
      provider,
      model,
    })
    .select('id')
    .single()

  // No-op update bumps updated_at via trigger so the conversation sorts to
  // the top of the list.
  await supabase
    .from('agent_conversations')
    .update({ provider, model })
    .eq('id', conversationId)

  return data?.id || null
}

// Replay only plain user/assistant text across turns — old tool payloads stay
// out of the context (they were already distilled into the assistant reply).
export async function loadTranscript(
  supabase: AgentSupabase,
  conversationId: string
): Promise<OAIMessage[]> {
  const { data } = await supabase
    .from('agent_messages')
    .select('role,content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)

  const rows = (data || []).reverse()
  return rows
    .filter(r => r.content)
    .map(r =>
      r.role === 'assistant'
        ? { role: 'assistant' as const, content: r.content }
        : { role: 'user' as const, content: r.content }
    )
}
