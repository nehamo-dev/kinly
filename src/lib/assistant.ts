// ─── Kinly assistant — Groq-backed chat ───────────────────────────────────────
// Calls Groq's llama-3.3-70b-versatile with a family context preamble.
// The API key is read from VITE_GROQ_API_KEY (client-side; acceptable for demo).

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

const SYSTEM_PROMPT = `You are Kinly, a warm and concise family assistant. You help parents stay on top of their family's schedule, tasks, and life admin.

Guidelines:
- Be brief and direct — 1-3 sentences max for most answers
- Use a friendly, calm tone — like a trusted friend who keeps things organised
- When you don't have specific data, say so simply rather than making things up
- Format times as "3:15pm" not "15:15"
- Never use emojis
- Address the family by name when known`

export async function askKinly(
  query: string,
  context: AssistantContext = {},
): Promise<string> {
  const client = getClient()

  const contextLines: string[] = []
  if (context.familyName)      contextLines.push(`Family: ${context.familyName}`)
  if (context.memberNames?.length) contextLines.push(`Members: ${context.memberNames.join(', ')}`)
  if (context.todayEvents?.length) {
    const evList = context.todayEvents.map((e) => `${e.time ?? '?'} ${e.title}`).join(', ')
    contextLines.push(`Today's events: ${evList}`)
  }
  if (context.pendingTaskCount !== undefined) {
    contextLines.push(`Pending tasks: ${context.pendingTaskCount}`)
  }

  const userMessage = contextLines.length
    ? `[Context: ${contextLines.join(' | ')}]\n\n${query}`
    : query

  const response = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system',    content: SYSTEM_PROMPT },
      { role: 'user',      content: userMessage   },
    ],
    max_tokens:  200,
    temperature: 0.4,
  })

  return response.choices[0]?.message?.content?.trim() ?? 'I couldn\'t get a response. Try again.'
}
