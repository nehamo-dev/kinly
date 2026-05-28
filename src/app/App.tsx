import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { DEMO_FAMILY_ID } from '../lib/demo'
// demoLocal kept for legacy localStorage cleanup (called from DemoBanner)

import { TopNav } from '../components/layout/TopNav'
import { DemoBanner } from '../components/layout/DemoBanner'

import { Welcome } from '../features/onboarding/Welcome'
import { Onboarding } from '../features/onboarding/Onboarding'
import { Home } from '../features/home/Home'
import { Family } from '../features/family/Family'
import { ShellScreen } from '../features/home/ShellScreen'
import { CalendarSettings } from '../features/calendar/CalendarSettings'
import { CalendarScreen } from '../features/calendar/CalendarScreen'
import { AuthCallback } from '../features/calendar/AuthCallback'

const queryClient = new QueryClient()

// ── FamilyId localStorage cache ───────────────────────────────────────────────
// Supabase free tier pauses projects after ~1 week of inactivity. When paused,
// all network calls (including loadFamilyId) can hang for 20-30 s. By caching
// the familyId in localStorage we can restore the authenticated state instantly
// on hard-refresh, then validate/update in the background once Supabase wakes.
const FAMILY_CACHE_KEY = 'kinly-family-id'

function getCachedFamilyId(): string | null {
  try { return localStorage.getItem(FAMILY_CACHE_KEY) } catch { return null }
}
function setCachedFamilyId(id: string): void {
  try { localStorage.setItem(FAMILY_CACHE_KEY, id) } catch {}
}
function clearCachedFamilyId(): void {
  try { localStorage.removeItem(FAMILY_CACHE_KEY) } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setFamilyId, setIsDemo } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let done = false
    const markReady = () => { if (!done) { done = true; setReady(true) } }

    // ── Fast path: cached familyId for instant restore ───────────────────
    const cachedFamilyId = getCachedFamilyId()

    // Derive the localStorage key Supabase uses for the auth token
    const sbTokenKey = (() => {
      try {
        const ref = new URL(import.meta.env.VITE_SUPABASE_URL ?? 'https://x.supabase.co').hostname.split('.')[0]
        return `sb-${ref}-auth-token`
      } catch { return null }
    })()

    // ── Fast path: shared demo family (no session, no Supabase needed) ──────
    // Demo users aren't signed in — they just read the pre-seeded family.
    // Skip all network calls and mark ready immediately.
    if (cachedFamilyId === DEMO_FAMILY_ID) {
      setFamilyId(DEMO_FAMILY_ID)
      setIsDemo(true)
      markReady()
      return
    }

    // ── Stale anonymous session cleanup ──────────────────────────────────
    // When a demo user's anonymous JWT has expired, the Supabase SDK will try
    // to refresh it on the next getSession() call — which requires a network
    // round-trip that hangs indefinitely if the project is paused.
    // Pre-emptively remove expired anonymous sessions so getSession() returns
    // null immediately (localStorage read only, no network).
    if (sbTokenKey) {
      try {
        const raw = localStorage.getItem(sbTokenKey)
        if (raw) {
          const parsed = JSON.parse(raw) as { expires_at?: number; user?: { is_anonymous?: boolean } }
          const exp = parsed?.expires_at ?? 0
          const isAnon = parsed?.user?.is_anonymous === true
          const isExpired = exp < Math.floor(Date.now() / 1000)
          if (isAnon && isExpired) {
            localStorage.removeItem(sbTokenKey)
            clearCachedFamilyId()
          }
        }
      } catch {}
    }

    // If both a session token and a family ID are in localStorage, we can
    // read the session synchronously right now so the failsafe can never
    // outrace us and redirect to /welcome.
    if (cachedFamilyId && sbTokenKey) {
      try {
        const rawToken = localStorage.getItem(sbTokenKey)
        if (rawToken) {
          const parsed = JSON.parse(rawToken) as { expires_at?: number }
          const exp: number = parsed?.expires_at ?? 0
          if (exp > Math.floor(Date.now() / 1000)) {
            // Token is still valid — pre-seed session into store synchronously
            setSession(parsed as Parameters<typeof setSession>[0])
            setFamilyId(cachedFamilyId)
          }
        }
      } catch { /* ignore — async path will handle it */ }
    }

    // Failsafe — 5 s ceiling before we show the page regardless
    const failsafe = setTimeout(markReady, 5000)

    // ── getSession with timeout ───────────────────────────────────────────
    // If getSession() hangs (e.g. SDK is mid-refresh over a slow connection),
    // treat it as no-session after 4 s and let the failsafe handle the rest.
    type SessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>
    const sessionWithTimeout: Promise<SessionResult> = Promise.race([
      supabase.auth.getSession(),
      new Promise<SessionResult>((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, error: null }), 4000)
      ),
    ])

    sessionWithTimeout.then(async ({ data: { session } }) => {
        setSession(session)

        if (session?.user) {
          // Apply cached familyId right away so ProtectedRoute can render
          if (cachedFamilyId) {
            setFamilyId(cachedFamilyId)
            markReady() // unblock UI immediately — don't wait for network
          }

          // Background: validate & refresh the cache from Supabase
          loadFamilyId(session.user.id).catch(() => {})

          if (session.user.is_anonymous) {
            const store = useAuthStore.getState()
            if (!store.familyId && window.location.pathname !== '/welcome') {
              // Stale anonymous session with no family — clear and send to Welcome.
              // Skip when already on /welcome so we don't abort an in-flight seed.
              setSession(null)
              setFamilyId(null)
              clearCachedFamilyId()
              supabase.auth.signOut().catch(() => {})
              window.location.replace('/welcome')
              return
            }
            // Only mark demo mode when a family actually exists in the store
            if (store.familyId) setIsDemo(true)
          }
        } else {
          // No session — clear any stale cache
          clearCachedFamilyId()
        }
      })
      .catch(() => {})
      .finally(() => { clearTimeout(failsafe); markReady() })

    // Listen for subsequent auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        await loadFamilyId(session.user.id).catch(() => {})
        if (session.user.is_anonymous) setIsDemo(true)
      } else {
        setFamilyId(null)
        setIsDemo(false)
        clearCachedFamilyId()
      }
    })

    return () => { subscription.unsubscribe(); clearTimeout(failsafe) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFamilyId(userId: string) {
    const { data } = await supabase
      .from('user_families')
      .select('family_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
    if (data?.family_id) {
      setCachedFamilyId(data.family_id)  // keep cache fresh
      setFamilyId(data.family_id)
    }
  }

  if (!ready) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#E8392A] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return <>{children}</>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session  = useAuthStore((s) => s.session)
  const familyId = useAuthStore((s) => s.familyId)
  const isDemo   = useAuthStore((s) => s.isDemo)

  // Demo users have no Supabase session — bypass all auth checks
  if (isDemo && familyId) return <>{children}</>
  if (session === null) return <Navigate to="/welcome" replace />
  // Anonymous users with no family → Welcome to start fresh
  if (session && !familyId && session.user?.is_anonymous) return <Navigate to="/welcome" replace />
  // Real users with no family → Onboarding
  if (session && !familyId) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <DemoBanner />
      <TopNav />
      {children}
    </div>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected app routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout>
                  <Home />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/family" element={
              <ProtectedRoute>
                <AppLayout>
                  <Family />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/calendar" element={
              <ProtectedRoute>
                <AppLayout>
                  <CalendarScreen />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/home" element={
              <ProtectedRoute>
                <AppLayout>
                  <ShellScreen title="Home" subtitle="Services, maintenance, and shopping lists" />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/inbox" element={
              <ProtectedRoute>
                <AppLayout>
                  <ShellScreen title="Inbox" subtitle="Emails flagged as relevant to your family" />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <AppLayout>
                  <CalendarSettings />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/settings/calendar" element={
              <ProtectedRoute>
                <AppLayout>
                  <CalendarSettings />
                </AppLayout>
              </ProtectedRoute>
            } />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
