import { supabase } from './supabase'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback`

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ')

// ─── OAuth URL ────────────────────────────────────────────────────────────────
export function buildGoogleAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    ...(state ? { state } : {}),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ─── Exchange code for tokens (via Supabase Edge Function or Vite dev proxy) ──
// In production, token exchange must happen server-side. This calls a Supabase
// Edge Function (or a /api/google-token Vercel function) to keep client_secret
// off the browser.
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch('/api/google-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  return res.json()
}

// ─── Refresh access token ─────────────────────────────────────────────────────
export async function refreshAccessToken(familyId: string, userId: string): Promise<string> {
  // Get current connection
  const { data: conn } = await supabase
    .from('google_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('family_id', familyId)
    .single()

  if (!conn) throw new Error('No Google connection found')

  // Check if still valid
  if (conn.token_expiry && new Date(conn.token_expiry) > new Date()) {
    return conn.access_token!
  }

  // Refresh
  const res = await fetch('/api/google-refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: conn.refresh_token }),
  })
  if (!res.ok) throw new Error('Token refresh failed')
  const { access_token, expires_in } = await res.json()

  const expiry = new Date(Date.now() + expires_in * 1000).toISOString()
  await supabase
    .from('google_connections')
    .update({ access_token, token_expiry: expiry })
    .eq('id', conn.id)

  return access_token
}

// ─── Fetch calendar events from Google ───────────────────────────────────────
export interface GoogleCalendarEvent {
  id: string
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  location?: string
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`)
  const data = await res.json()
  return data.items || []
}

// ─── Sync Google Calendar events to Supabase ─────────────────────────────────
export async function syncCalendarEvents(
  familyId: string,
  userId: string,
  members: { id: string; name: string }[]
): Promise<void> {
  const accessToken = await refreshAccessToken(familyId, userId)

  const now = new Date()
  const timeMin = now.toISOString()
  const timeMax = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const googleEvents = await fetchGoogleCalendarEvents(accessToken, timeMin, timeMax)

  // Upsert into events table
  const rows = googleEvents.map((ge) => {
    const dateTime = ge.start.dateTime || ge.start.date || ''
    const date = dateTime.split('T')[0]
    const timeStart = ge.start.dateTime
      ? new Date(ge.start.dateTime).toTimeString().slice(0, 5)
      : null

    // Fuzzy match member names
    const matchedMember = members.find((m) =>
      ge.summary?.toLowerCase().includes(m.name.split(' ')[0].toLowerCase())
    )

    return {
      family_id: familyId,
      member_id: matchedMember?.id || null,
      service_id: null,
      title: ge.summary || '(No title)',
      date,
      time_start: timeStart,
      source: 'calendar' as const,
      calendar_event_id: ge.id,
      gmail_message_id: null,
    }
  })

  if (rows.length > 0) {
    await supabase
      .from('events')
      .upsert(rows, { onConflict: 'calendar_event_id' })
  }
}

// ─── Disconnect Google Calendar ───────────────────────────────────────────────
export async function disconnectCalendar(familyId: string, userId: string): Promise<void> {
  await supabase
    .from('google_connections')
    .delete()
    .eq('user_id', userId)
    .eq('family_id', familyId)

  await supabase
    .from('events')
    .delete()
    .eq('family_id', familyId)
    .eq('source', 'calendar')
}
