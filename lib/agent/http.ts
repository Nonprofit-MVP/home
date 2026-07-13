// Shared fetch helpers for the external data-source integrations.
// Ported from exemplar's netlify-functions/lib/integrations/http.js.
// Node 18+ has global fetch/AbortController — no dependency needed.

const DEFAULT_TIMEOUT_MS = 12000
const DEFAULT_UA =
  'Journality-ResearchAgent/1.0 (contact: set CONTACT_EMAIL env var)'

export interface FetchOpts {
  headers?: Record<string, string>
  timeoutMs?: number
  method?: string
  body?: string
  source?: string
  retries?: number
  retryBackoffMs?: number
}

export class UpstreamError extends Error {
  status: number
  source?: string
  url?: string
  body?: unknown

  constructor(
    message: string,
    {
      status = 502,
      source,
      url,
      body,
    }: { status?: number; source?: string; url?: string; body?: unknown } = {}
  ) {
    super(message)
    this.name = 'UpstreamError'
    this.status = status
    this.source = source
    this.url = url
    this.body = typeof body === 'string' ? body.slice(0, 500) : body
  }
}

export function contactEmail(): string {
  return process.env.CONTACT_EMAIL || 'contact@example.com'
}

// Resolve a data-source API key from the environment (exemplar's keyStore
// allowed per-request browser overrides; here keys are deploy-time only).
export function envKey(name: string): string | undefined {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

// Builds a query string from a params object, dropping undefined/null/empty values.
export function buildQuery(params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, String(v))
    } else {
      search.append(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

async function withTimeout<T>(
  timeoutMs: number,
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fn(controller.signal)
  } finally {
    clearTimeout(timer)
  }
}

async function rawFetch(
  url: string,
  { headers = {}, timeoutMs = DEFAULT_TIMEOUT_MS, method = 'GET', body, source }: FetchOpts = {}
): Promise<Response> {
  let res: Response
  try {
    res = await withTimeout(timeoutMs, signal =>
      fetch(url, {
        method,
        signal,
        body,
        headers: {
          'User-Agent': DEFAULT_UA,
          Accept: 'application/json, application/xml, text/xml, */*',
          ...headers,
        },
      })
    )
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new UpstreamError(
        `Request to ${source || 'upstream'} timed out after ${timeoutMs}ms`,
        { status: 504, source, url }
      )
    }
    throw new UpstreamError(
      `Network error calling ${source || 'upstream'}: ${err?.message}`,
      { status: 502, source, url }
    )
  }
  return res
}

const RETRYABLE_STATUS = new Set([429, 503])

// rawFetch + body read, with optional paced retry on transient upstream
// statuses (429/503). Retry is opt-in via opts.retries (default 0).
async function fetchWithRetry(
  url: string,
  opts: FetchOpts = {}
): Promise<{ res: Response; text: string }> {
  const retries = Math.max(0, Number(opts.retries) || 0)
  const backoffMs = Number(opts.retryBackoffMs) || 3000
  let attempt = 0
  for (;;) {
    const res = await rawFetch(url, opts)
    const text = await res.text()
    if (res.ok || attempt >= retries || !RETRYABLE_STATUS.has(res.status)) {
      return { res, text }
    }
    // Honor the server's Retry-After when present, else a fixed backoff; cap
    // the wait so a retry can't blow the agent loop's runtime budget.
    const retryAfter = Number(res.headers.get('retry-after'))
    const waitMs = Math.min(
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs,
      5000
    )
    attempt += 1
    await new Promise(resolve => setTimeout(resolve, waitMs))
  }
}

export async function fetchJSON(url: string, opts: FetchOpts = {}): Promise<any> {
  const { res, text } = await fetchWithRetry(url, opts)
  if (!res.ok) {
    throw new UpstreamError(`${opts.source || 'Upstream'} responded ${res.status}`, {
      status: res.status,
      source: opts.source,
      url,
      body: text,
    })
  }
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    throw new UpstreamError(`${opts.source || 'Upstream'} returned non-JSON response`, {
      status: 502,
      source: opts.source,
      url,
      body: text,
    })
  }
}

export async function fetchText(url: string, opts: FetchOpts = {}): Promise<string> {
  const { res, text } = await fetchWithRetry(url, opts)
  if (!res.ok) {
    throw new UpstreamError(`${opts.source || 'Upstream'} responded ${res.status}`, {
      status: res.status,
      source: opts.source,
      url,
      body: text,
    })
  }
  return text
}

export function requireParam(
  params: Record<string, unknown> | undefined,
  name: string,
  actionLabel: string
): unknown {
  const value = params ? params[name] : undefined
  if (value === undefined || value === null || value === '') {
    throw new UpstreamError(
      `Missing required parameter "${name}" for ${actionLabel}`,
      { status: 400, source: actionLabel }
    )
  }
  return value
}
