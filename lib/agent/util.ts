// Shared helpers for the research agent, ported from exemplar's agent loop.

export const MAX_TOOL_RESULT_CHARS = 16_000

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function truncateMiddle(
  text: unknown,
  maxChars: number
): { text: string; truncated: boolean } {
  const source =
    typeof text === 'string' ? text : JSON.stringify(text ?? null, null, 2)
  if (source.length <= maxChars) {
    return { text: source, truncated: false }
  }

  const headSize = Math.floor(maxChars * 0.7)
  const tailSize = Math.floor(maxChars * 0.25)
  return {
    text: `${source.slice(0, headSize)}\n\n... [truncated] ...\n\n${source.slice(-tailSize)}`,
    truncated: true,
  }
}

export function safeJsonStringify(
  value: unknown,
  maxChars: number = MAX_TOOL_RESULT_CHARS
): string {
  let serialized: string
  try {
    serialized = JSON.stringify(value, null, 2) ?? 'null'
  } catch {
    serialized = String(value)
  }
  return truncateMiddle(serialized, maxChars).text
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
