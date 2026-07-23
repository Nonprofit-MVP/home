import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase'

const ARTICLE_CARD_COLS =
  'id,title,excerpt,authors,cover_image_url,source_name,source_url,published_at,created_at,view_count,field_tags'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 12), 50)
  const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0)

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('articles')
    .select(ARTICLE_CARD_COLS)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ articles: data ?? [] })
}
