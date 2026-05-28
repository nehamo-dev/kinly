// ─── Kinly assistant — Groq-backed chat ───────────────────────────────────────
// Calls Groq's llama-3.3-70b-versatile with a family context preamble.
// The API key is read from VITE_GROQ_API_KEY (client-side; acceptable for demo).
// For production, proxy through a Vercel Edge Function instead.

import Groq from 'groq-sdk'

let _client: Groq | null = null

function getClient(): Groq {
  if (_client) return _client
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined
  if (!apiKey) {
    throw new Error('VITE_GROQ_API_KEY is not set. Add it to .env.local to enable Kinly AI.')
  }
  _client = new Groq({ apiKey, dangerouslyAllowBrowser: true })
  return _client
}

export interface AssistantContext {
  familyName?: string
  memberNames?: string[]
  todayEvents?: Array<{ title: string; time: string | null }>
  pendingTaskCount?: number
}

export type Message = { role: 'user' | 'assistant'; content: string }

const SYSTEM_PROMPT = `You are Kinly, a warm and concise family assistant. You help parents stay on top of their family's schedule, tasks, and life admin.

Guidelines:
- Be brief and direct — 1-3 sentences max for most answers
- Use a friendly, calm tone — like a trusted friend who keeps things organised
- When you don't have specific data, say so simply rather than making things up
- Format times as "3:15pm" not "15:15"
- Never use emojis
- Address the family by name when known`

function buildSystemContent(context: AssistantContext): string {
  const lines: string[] = [SYSTEM_PROMPT]
  const ctx: string[] = []
  if (context.familyName)            ctx.push(`Family: ${context.familyName}`)
  if (context.memberNames?.length)   ctx.push(`Members: ${context.memberNames.join(', ')}`)
  if (context.todayEvents?.length) {
    const evList = context.todayEvents.map((e) => `${e.time ?? '?'} ${e.title}`).join(', ')
    ctx.push(`Today's events: ${evList}`)
  }
  if (context.pendingTaskCount !== undefined) ctx.push(`Pending tasks: ${context.pendingTaskCount}`)
  if (ctx.length) lines.push(`\nCurrent context: ${ctx.join(' | ')}`)
  return lines.join('\n')
}

// ── Streaming via SDK (dev — uses VITE_GROQ_API_KEY) ─────────────────────────
async function streamViaSDK(
  messages: Message[],
  context: AssistantContext,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const client = getClient()

  const stream = await client.chat.completions.create(
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: buildSystemContent(context) },
        ...messages,
      ],
      max_tokens:  300,
      temperature: 0.4,
      stream:      true,
    },
    { signal },
  )

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? ''
    if (delta) onChunk(delta)
  }
}

// ── Streaming via server proxy (prod — uses /api/kinly) ───────────────────────
async function streamViaProxy(
  messages: Message[],
  context: AssistantContext,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/kinly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  const reader  = res.body!.getReader()
  const decoder = new TextDecoder()
  let   buffer  = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Process complete SSE lines
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''   // keep incomplete last line for next chunk

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }
        const chunk  = parsed.choices?.[0]?.delta?.content ?? ''
        if (chunk) onChunk(chunk)
      } catch { /* skip malformed lines */ }
    }
  }
}

// ── Public streaming entry-point ──────────────────────────────────────────────
// Uses the SDK directly in dev (VITE_GROQ_API_KEY set), proxy in production.

export async function streamKinly(
  messages: Message[],
  context: AssistantContext,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const clientKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined
  if (clientKey) {
    return streamViaSDK(messages, context, onChunk, signal)
  }
  return streamViaProxy(messages, context, onChunk, signal)
}

// ── Non-streaming (legacy / fallback) ────────────────────────────────────────
export async function askKinly(
  query: string,
  context: AssistantContext = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    let full = ''
    streamKinly(
      [{ role: 'user', content: query }],
      context,
      (chunk) => { full += chunk },
    ).then(() => resolve(full.trim() || 'I couldn\'t get a response. Try again.'))
      .catch(reject)
  })
}
