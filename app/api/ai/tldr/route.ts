import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { title, abstract, mode } = await request.json()

  if (!title || !abstract) {
    return NextResponse.json({ error: 'Missing title or abstract' }, { status: 400 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Missing ANTHROPIC_API_KEY (set it in your server environment / .env.local and restart the dev server).' },
      { status: 500 }
    )
  }

  const systemPrompt = mode === 'plain'
    ? 'You are an expert science communicator. Rephrase the following TL;DR for a general audience with no technical background. Use simple language anyone can understand. Output only the rephrased summary, no preamble.'
    : 'You are an expert scientific communicator. Generate a 2-3 sentence TL;DR of this research paper that captures the core contribution and findings. Be precise and accurate. Do not use jargon. Output only the TL;DR, no preamble.'

  try {
    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 256,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Title: ${title}\n\nAbstract: ${abstract}`,
        },
      ],
    })

    const tldr = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ tldr })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
