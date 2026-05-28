/**
 * demoLocal.ts — legacy cleanup helpers.
 *
 * Demo mode now uses a Supabase anonymous session backed by a real seeded
 * family (see lib/demo.ts → seedDemoFamily). This file is kept only to
 * clear any old localStorage keys that may exist from the previous
 * local-only demo implementation.
 */

const DEMO_KEY      = 'kinly-demo'
const COMPLETED_KEY = 'kinly-demo-done'

/** Clears any legacy local-demo localStorage keys. Safe to call at any time. */
export function clearDemoState(): void {
  try {
    localStorage.removeItem(DEMO_KEY)
    localStorage.removeItem(COMPLETED_KEY)
  } catch {}
}
