import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Kinly] Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    'in .env.local (dev) or Vercel Environment Variables (prod) and rebuild.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
)

// ── Connection warm-up ────────────────────────────────────────────────────────
// Supabase free tier pauses projects after ~1 week of inactivity. The first
// request wakes the project (~20-30s). Firing cheap pings to both REST and
// Auth at module init (before the user clicks anything) means the wake-up is
// already in progress by the time they hit "See demo". Each ping has a 10s
// abort so they don't hold browser connection slots open indefinitely.
if (supabaseUrl && supabaseAnonKey) {
  const warmPing = (url: string, extraHeaders?: Record<string, string>) => {
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 10_000)
    fetch(url, { method: 'HEAD', headers: extraHeaders, signal: ctrl.signal }).catch(() => {})
  }
  warmPing(`${supabaseUrl}/rest/v1/`)
  warmPing(`${supabaseUrl}/auth/v1/`, { apikey: supabaseAnonKey })
}
