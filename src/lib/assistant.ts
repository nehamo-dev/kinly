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

// ── Streaming (primary) ───────────────────────────────────────────────────────
// Streams the Groq response chunk-by-chunk, calling onChunk for each delta.

export async function streamKinly(
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
