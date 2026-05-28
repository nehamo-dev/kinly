// ─── /api/kinly — server-side Groq proxy ─────────────────────────────────────
// Vercel Edge Function. Receives { messages, context } via POST, calls Groq
// with the server-side GROQ_API_KEY, and streams the SSE response back.
// The client-side bundle never sees the API key this way.

export const config = { runtime: 'edge' }

const SYSTEM_PROMPT = `You are Kinly, a warm and concise family assistant. You help parents stay on top of their family's schedule, tasks, and life admin.

Guidelines:
- Be brief and direct — 1-3 sentences max for most answers
- Use a friendly, calm tone — like a trusted friend who keeps things organised
- When you don't have specific data, say so simply rather than making things up
- Format times as "3:15pm" not "15:15"
- Never use emojis
- Address the family by name when known`

interface Context {
  familyName?: string
  memberNames?: string[]
  todayEvents?: Array<{ title: string; time: string | null }>
  pendingTaskCount?: number
}

function buildSystemContent(ctx: Context): string {
  const parts: string[] = [SYSTEM_PROMPT]
  const lines: string[] = []
  if (ctx.familyName)          lines.push(`Family: ${ctx.familyName}`)
  if (ctx.memberNames?.length) lines.push(`Members: ${ctx.memberNames.join(', ')}`)
  if (ctx.todayEvents?.length) {
    lines.push(`Today's events: ${ctx.todayEvents.map((e) => `${e.time ?? '?'} ${e.title}`).join(', ')}`)
  }
  if (ctx.pendingTaskCount !== undefined) lines.push(`Pending tasks: ${ctx.pendingTaskCount}`)
  if (lines.length) parts.push(`\nCurrent context: ${lines.join(' | ')}`)
  return parts.join('\n')
}

export default async function handler(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured on server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let messages: Array<{ role: string; content: string }>
  let context: Context = {}
  try {
    const body = await req.json() as { messages?: typeof messages; context?: Context }
    messages = body.messages ?? []
    context  = body.context ?? {}
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'system', content: buildSystemContent(context) }, ...messages],
      max_tokens:  300,
      temperature: 0.4,
      stream:      true,
    }),
    signal: req.signal,
  })

  if (!groqRes.ok) {
    const errText = await groqRes.text()
    return new Response(JSON.stringify({ error: errText }), {
      status: groqRes.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Pass Groq's SSE stream straight through to the client
  return new Response(groqRes.body, {
    headers: {
      'Content-Type':     'text/event-stream',
      'Cache-Control':    'no-cache',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
