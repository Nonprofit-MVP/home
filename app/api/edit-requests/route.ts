import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const paperId = searchParams.get('paper_id')

  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('edit_requests')
    .select('*, paper:papers(title, id), requester:users(full_name, username)')

  if (paperId) query = query.eq('paper_id', paperId)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { paper_id, proposed_changes } = body as { paper_id: string; proposed_changes: string }

  if (!paper_id || !proposed_changes) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('edit_requests')
    .insert({
      paper_id,
      requester_id: user.id,
      proposed_changes,
      status: 'open',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status, reviewer_comment } = await request.json()

  const { data, error } = await supabase
    .from('edit_requests')
    .update({
      status,
      reviewer_comment: reviewer_comment || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
