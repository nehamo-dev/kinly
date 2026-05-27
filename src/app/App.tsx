import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { getDemoState, clearDemoState, DEMO_FAMILY_ID } from '../lib/demoLocal'

import { TopNav } from '../components/layout/TopNav'
import { DemoBanner } from '../components/layout/DemoBanner'

import { Welcome } from '../features/onboarding/Welcome'
import { Onboarding } from '../features/onboarding/Onboarding'
import { Home } from '../features/home/Home'
import { ShellScreen } from '../features/home/ShellScreen'
import { CalendarSettings } from '../features/calendar/CalendarSettings'
import { AuthCallback } from '../features/calendar/AuthCallback'

const queryClient = new QueryClient()

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setFamilyId, setIsDemo } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let done = false
    const markReady = () => { if (!done) { done = true; setReady(true) } }

    // ── Fast path: local-only demo mode ────────────────────────────────────
    // If demo state is persisted in localStorage we can restore instantly
    // without touching Supabase at all — avoids cold-start hang.
    const demo = getDemoState()
    if (demo?.familyId) {
      setFamilyId(demo.familyId)
      setIsDemo(true)
      markReady()

      // Still watch for a real sign-in so we can switch out of demo
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user && !session.user.is_anonymous) {
          clearDemoState()
          setSession(session)
          setIsDemo(false)
          setFamilyId(null)
          await loadFamilyId(session.user.id).catch(() => {})
        }
      })
      return () => subscription.unsubscribe()
    }

    // ── Normal path: Supabase auth ─────────────────────────────────────────
    // Failsafe reduced to 2 s (was 5 s) — Supabase cold-start is slow on
    // the free tier; we'd rather show the Welcome page quickly and let the
    // user proceed than block on a potentially sleeping DB.
    const failsafe = setTimeout(markReady, 2000)

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setSession(session)
        if (session?.user) {
          await loadFamilyId(session.user.id).catch(() => {})
          if (session.user.is_anonymous) {
            const store = useAuthStore.getState()
            if (!store.familyId) {
              // Stale anonymous session with no family — clear and send to Welcome
              setSession(null)
              setFamilyId(null)
              supabase.auth.signOut().catch(() => {})
              window.location.replace('/welcome')
              return
            }
            setIsDemo(true)
          }
        }
      })
      .catch(() => {})
      .finally(() => { clearTimeout(failsafe); markReady() })

    // Listen for subsequent auth changes (sign-in, sign-out, token refresh)
    // Do NOT do stale-session cleanup here — this fires during demo seed before
    // the family has been created, which would incorrectly boot the user out.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        await loadFamilyId(session.user.id).catch(() => {})
        if (session.user.is_anonymous) setIsDemo(true)
      } else {
        setFamilyId(null)
        setIsDemo(false)
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
      .single()
    if (data?.family_id) setFamilyId(data.family_id)
  }

  if (!ready) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#E8392A] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return <>{children}</>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session)
  const familyId = useAuthStore((s) => s.familyId)
  const isDemo = useAuthStore((s) => s.isDemo)

  // Local demo mode — no real session needed
  if (isDemo && familyId === DEMO_FAMILY_ID) return <>{children}</>

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
                  <ShellScreen title="Family" subtitle="Manage your household members and activities" />
                </AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/calendar" element={
              <ProtectedRoute>
                <AppLayout>
                  <ShellScreen title="Calendar" subtitle="Your family's full schedule at a glance" />
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
