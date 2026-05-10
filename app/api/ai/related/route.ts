import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { title, abstract, tags } = await request.json()

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Missing ANTHROPIC_API_KEY (set it in your server environment / .env.local and restart the dev server).' },
        { status: 500 }
      )
    }

    // Use Claude to extract key concepts
    const conceptsMsg = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 128,
      messages: [
        {
          role: 'user',
          content: `Extract 5 key technical concepts from this research paper. Output only a comma-separated list of concepts, no preamble.

Title: ${title}
Abstract: ${abstract?.slice(0, 500)}`,
        },
      ],
    })

    const concepts = conceptsMsg.content[0].type === 'text'
      ? conceptsMsg.content[0].text.split(',').map(c => c.trim().toLowerCase())
      : []

    const supabase = await createServerSupabaseClient()

    // Find papers with overlapping tags
    const allTags = [...(tags || []), ...concepts.slice(0, 3)]
    const { data: papers } = await supabase
      .from('papers')
      .select('*')
      .neq('status', 'draft')
      .overlaps('field_tags', allTags.slice(0, 5))
      .neq('title', title)
      .limit(4)

    // If not enough, fallback to recent papers
    let result = papers || []
    if (result.length < 4) {
      const { data: recent } = await supabase
        .from('papers')
        .select('*')
        .neq('status', 'draft')
        .neq('title', title)
        .order('created_at', { ascending: false })
        .limit(4 - result.length)
      result = [...result, ...(recent || [])]
    }

    return NextResponse.json({ papers: result.slice(0, 4) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
