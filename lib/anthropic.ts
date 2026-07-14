import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const CLAUDE_MODEL = 'claude-sonnet-4-6'

// Returns a clear reason when the AI can't run, so the UI can tell the user to
// configure a key instead of showing a generic error.
export function anthropicKeyStatus(): { ok: boolean; message: string } {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) {
    return { ok: false, message: 'AI is not configured: ANTHROPIC_API_KEY is not set in the server environment (.env).' }
  }
  if (!key.startsWith('sk-ant-')) {
    return { ok: false, message: 'AI is not configured: ANTHROPIC_API_KEY is a placeholder. Add a real key from console.anthropic.com to .env and restart the dev server.' }
  }
  return { ok: true, message: '' }
}
