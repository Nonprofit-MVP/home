import { anthropic, CLAUDE_MODEL, anthropicKeyStatus } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export interface StudyTools {
  takeaways: string[]
  glossary: { term: string; definition: string }[]
  flashcards: { question: string; answer: string }[]
}

export async function POST(request: Request) {
  const { title, abstract, tldr } = await request.json()

  if (!title || !abstract) {
    return NextResponse.json({ error: 'Missing title or abstract' }, { status: 400 })
  }

  const keyStatus = anthropicKeyStatus()
  if (!keyStatus.ok) {
    return NextResponse.json({ error: keyStatus.message }, { status: 503 })
  }

  const systemPrompt = `You are a research study-tools generator. From a paper's title and abstract, produce study aids that help a reader learn the material fast.

Return ONLY valid JSON (no markdown fences, no preamble) matching exactly this shape:
{
  "takeaways": ["concise key point", ...],       // 4-6 items, each one sentence
  "glossary": [{"term": "...", "definition": "..."}, ...],  // 4-8 technical terms actually used in the paper, defined plainly in one sentence
  "flashcards": [{"question": "...", "answer": "..."}, ...]  // 4-6 Q/A pairs that test understanding of the paper's contribution and findings
}

Be accurate and specific to this paper. Do not include terms or claims not grounded in the provided text.`

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Title: ${title}\n\nAbstract: ${abstract}${tldr ? `\n\nTL;DR: ${tldr}` : ''}`,
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    // Be tolerant of accidental fences or stray text around the JSON.
    const jsonStr = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
    let parsed: StudyTools
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({ error: 'Failed to parse study tools' }, { status: 502 })
    }

    return NextResponse.json({
      takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways.slice(0, 8) : [],
      glossary: Array.isArray(parsed.glossary) ? parsed.glossary.slice(0, 10) : [],
      flashcards: Array.isArray(parsed.flashcards) ? parsed.flashcards.slice(0, 8) : [],
    } satisfies StudyTools)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
