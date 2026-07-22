import { NextResponse } from 'next/server'
import {
  resolveProvider,
  modelFor,
  streamOpenAICompatible,
  type OAIMessage,
} from '@/lib/agent/providers'
import { streamAnthropic } from '@/lib/agent/anthropic-provider'

export interface StudyTools {
  takeaways: string[]
  glossary: { term: string; definition: string }[]
  flashcards: { question: string; answer: string }[]
}

// Pull a parseable JSON object out of a model reply that may include markdown
// fences, // or /* */ comments, or trailing commas.
function extractJson(content: string): string {
  let s = content.trim()
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) s = s.slice(start, end + 1)
  s = s.replace(/\/\*[\s\S]*?\*\//g, '') // block comments
  s = s.replace(/(^|[^:])\/\/[^\n\r]*/g, '$1') // line comments (skip :// in URLs)
  s = s.replace(/,(\s*[}\]])/g, '$1') // trailing commas
  return s.trim()
}

export async function POST(request: Request) {
  const { title, abstract, tldr } = await request.json()

  if (!title || !abstract) {
    return NextResponse.json({ error: 'Missing title or abstract' }, { status: 400 })
  }

  // Same provider architecture as the agent (OpenRouter etc.) — not the raw
  // Anthropic SDK. Study tools are a single structured generation, so no tools.
  const provider = resolveProvider()
  if (!provider) {
    return NextResponse.json(
      { error: 'No AI provider is configured. Add an OpenRouter (or other) API key to .env and restart the dev server.' },
      { status: 503 }
    )
  }
  const model = modelFor(provider)
  const streamCall = provider.kind === 'anthropic' ? streamAnthropic : streamOpenAICompatible

  const systemPrompt = `You are a research study-tools generator. From a paper's title and abstract, produce study aids that help a reader learn the material fast.

Return ONLY valid JSON (no markdown fences, no preamble) matching exactly this shape:
{
  "takeaways": ["concise key point", ...],       // 4-6 items, each one sentence
  "glossary": [{"term": "...", "definition": "..."}, ...],  // 4-8 technical terms actually used in the paper, defined plainly in one sentence
  "flashcards": [{"question": "...", "answer": "..."}, ...]  // 4-6 Q/A pairs that test understanding of the paper's contribution and findings
}

Be accurate and specific to this paper. Do not include terms or claims not grounded in the provided text.`

  const messages: OAIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Title: ${title}\n\nAbstract: ${abstract}${tldr ? `\n\nTL;DR: ${tldr}` : ''}` },
  ]

  try {
    const result = await streamCall({
      provider,
      model,
      messages,
      toolChoice: 'none',
      maxTokens: 3000, // headroom: reasoning models spend budget thinking before the JSON
      onToken: () => {},
    })

    // Reasoning models stream their chain-of-thought separately, so `content`
    // should be just the JSON — but be tolerant of fences, // comments (which
    // our schema example uses), and trailing commas.
    let parsed: StudyTools
    try {
      parsed = JSON.parse(extractJson(result.content || ''))
    } catch {
      return NextResponse.json({ error: 'The model did not return valid study tools. Try again.' }, { status: 502 })
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
