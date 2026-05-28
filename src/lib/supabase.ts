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
// Supabase has a ~600ms cold-connection penalty on the first authenticated
// PostgREST request (TCP + TLS + JWT verification). Subsequent requests on
// the same connection take ~23ms. Firing a cheap HEAD here — at module init,
// before React renders or auth resolves — pre-establishes the TCP+TLS so the
// first real query (loadFamilyId, tasks, events) arrives on a warm connection.
if (supabaseUrl && supabaseAnonKey) {
  void fetch(`${supabaseUrl}/rest/v1/`, { method: 'HEAD' }).catch(() => {})
}
