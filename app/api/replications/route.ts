import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const paperId = searchParams.get('paper_id')

  const supabase = await createServerSupabaseClient()
  let query = supabase.from('replication_attempts').select('*, researcher:users(*)')
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
  const { paper_id, institution, outcome, notes, replication_paper_url } = body

  const { data, error } = await supabase
    .from('replication_attempts')
    .insert({
      paper_id,
      researcher_id: user.id,
      institution,
      outcome,
      notes: notes || null,
      replication_paper_url: replication_paper_url || null,
    })
    .select('*, researcher:users(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Update replication score on paper
  const { data: attempts } = await supabase
    .from('replication_attempts')
    .select('outcome')
    .eq('paper_id', paper_id)

  if (attempts) {
    const total = attempts.length
    const successful = attempts.filter(a => a.outcome === 'replicated').length
    const partial = attempts.filter(a => a.outcome === 'partial').length
    const score = total > 0 ? (successful + partial * 0.5) / total : 0
    await supabase.from('papers').update({ replication_score: score }).eq('id', paper_id)
  }

  return NextResponse.json(data, { status: 201 })
}
