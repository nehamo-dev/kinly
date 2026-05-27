import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

// Untyped for now — once the Supabase project is live, run:
//   npx supabase gen types typescript --project-id <project-id> > src/types/supabase.ts
// and pass the generated Database generic to createClient<Database>()
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
