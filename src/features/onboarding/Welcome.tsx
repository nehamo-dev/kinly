import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'
import { seedDemoFamily } from '../../lib/demo'
import { useAuthStore } from '../../store/authStore'

type AuthView = 'landing' | 'signup' | 'login'

export function Welcome() {
  const [view, setView] = useState<AuthView>('landing')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const setFamilyId = useAuthStore((s) => s.setFamilyId)
  const setIsDemo = useAuthStore((s) => s.setIsDemo)

  async function handleDemoMode() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: signInErr } = await supabase.auth.signInAnonymously()
      if (signInErr || !data.user) throw signInErr || new Error('Sign-in failed')
      const familyId = await seedDemoFamily(data.user.id)
      setFamilyId(familyId)
      setIsDemo(true)
      navigate('/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error: signUpErr } = await supabase.auth.signUp({ email, password })
      if (signUpErr) throw signUpErr
      setMessage('Check your email for a confirmation link.')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-up failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
      if (loginErr) throw loginErr
      navigate('/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSSO() {
    const { error: ssoErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (ssoErr) setError(ssoErr.message)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo + headline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1D9E75] mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M7 17V7l4 5 4-5v10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Kinly</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Family logistics, finally organised.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          {view === 'landing' && (
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={() => setView('signup')}>
                Create account
              </Button>
              <Button variant="secondary" size="lg" className="w-full" onClick={handleGoogleSSO}>
                <GoogleIcon />
                Continue with Google
              </Button>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400">or</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="lg"
                className="w-full text-slate-600"
                onClick={handleDemoMode}
                loading={loading}
              >
                ✦ Try with demo data
              </Button>
              <p className="text-xs text-slate-400 text-center mt-1">
                No account required · resets after 24 hours
              </p>
              <button
                className="text-xs text-slate-400 hover:text-slate-600 text-center mt-1 underline"
                onClick={() => setView('login')}
              >
                Already have an account? Log in
              </button>
            </div>
          )}

          {(view === 'signup' || view === 'login') && (
            <form
              onSubmit={view === 'signup' ? handleSignup : handleLogin}
              className="flex flex-col gap-4"
            >
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-600 self-start -mt-1 mb-1"
                onClick={() => { setView('landing'); setError(null); setMessage(null) }}
              >
                ← Back
              </button>
              <h2 className="text-lg font-semibold text-slate-900">
                {view === 'signup' ? 'Create your account' : 'Welcome back'}
              </h2>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                helper={view === 'signup' ? 'At least 8 characters' : undefined}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-[#1D9E75]">{message}</p>}
              <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
                {view === 'signup' ? 'Create account' : 'Log in'}
              </Button>
              {view === 'signup' && (
                <button
                  type="button"
                  className="text-xs text-slate-400 hover:text-slate-600 text-center underline"
                  onClick={() => setView('login')}
                >
                  Already have an account? Log in
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
