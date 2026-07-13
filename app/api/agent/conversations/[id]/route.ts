import { createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function requireUser() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await requireUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: conversation } = await supabase
    .from('agent_conversations')
    .select('id,title,context,provider,model,created_at,updated_at')
    .eq('id', params.id)
    .single()

  if (!conversation) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const { data: messages } = await supabase
    .from('agent_messages')
    .select('id,role,content,tool_calls,sources,provider,model,created_at')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true })

  return Response.json({ conversation, messages: messages || [] })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await requireUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { title?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 80) : ''
  if (!title) {
    return Response.json({ error: 'title is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('agent_conversations')
    .update({ title })
    .eq('id', params.id)
    .select('id')
    .single()

  if (error || !data) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await requireUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('agent_conversations')
    .delete()
    .eq('id', params.id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
