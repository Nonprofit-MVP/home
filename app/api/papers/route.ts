import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '0')
  const limit = parseInt(searchParams.get('limit') || '10')
  const status = searchParams.get('status')
  const tag = searchParams.get('tag')
  const sort = searchParams.get('sort') || 'created_at'

  const supabase = await createServerSupabaseClient()
  const from = page * limit
  const to = from + limit - 1

  let query = supabase
    .from('papers')
    .select('*')
    .neq('status', 'draft')
    .range(from, to)

  if (status) query = query.eq('status', status)
  if (tag) query = query.contains('field_tags', [tag])
  query = query.order(sort, { ascending: false })

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ papers: data, total: count })
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('papers')
    .insert({ ...body, submitter_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
