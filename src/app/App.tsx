import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

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

  useEffect(() => {
    // Restore session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        await loadFamilyId(session.user.id)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        await loadFamilyId(session.user.id)
        // Anonymous users = demo mode
        if (session.user.is_anonymous) {
          setIsDemo(true)
        }
      } else {
        setFamilyId(null)
        setIsDemo(false)
      }
    })

    return () => subscription.unsubscribe()
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

  return <>{children}</>
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session)
  const familyId = useAuthStore((s) => s.familyId)

  if (session === null) return <Navigate to="/welcome" replace />
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
