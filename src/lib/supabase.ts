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
  {
    auth: {
      // Surface auth errors quickly rather than hanging
      autoRefreshToken: true,
      persistSession: true,
    },
    global: {
      fetch: (url, opts) => {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), 10_000) // 10s timeout
        return fetch(url, { ...opts, signal: controller.signal })
          .finally(() => clearTimeout(id))
      },
    },
  }
)
