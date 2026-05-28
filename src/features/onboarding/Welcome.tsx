import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { seedDemoFamily } from '../../lib/demo'

export function Welcome() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const navigate = useNavigate()
  const setFamilyId = useAuthStore((s) => s.setFamilyId)
  const setIsDemo = useAuthStore((s) => s.setIsDemo)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/` },
      })
      if (otpErr) throw otpErr
      setSent(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
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

  async function handleDemoMode() {
    setDemoLoading(true)
    setError(null)
    try {
      // Create an anonymous Supabase session — gives a real JWT with no sign-up required
      const { data, error: authErr } = await supabase.auth.signInAnonymously()
      if (authErr || !data.user) throw authErr || new Error('Sign-in failed')

      // Seed demo family data (4 parallelised batches, ~1 s on warm connection)
      const familyId = await seedDemoFamily(data.user.id)

      // Cache so hard-refresh restores instantly without re-fetching
      try { localStorage.setItem('kinly-family-id', familyId) } catch {}

      setFamilyId(familyId)
      setIsDemo(true)
      navigate('/')
      // setDemoLoading(false) intentionally omitted — component unmounts on navigate
    } catch (err) {
      console.error('[Kinly] Demo setup failed:', err)
      setError('Demo setup failed — please try again')
      setDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo + headline */}
        <div className="text-center mb-10">
          <KinlyLogo />
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mt-5">Kinly</h1>
          <p className="text-slate-500 mt-2 text-sm">Family logistics, finally organised.</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          {sent ? (
            <div className="text-center py-2">
              <div className="text-3xl mb-3">✉️</div>
              <p className="font-medium text-slate-900">Check your inbox</p>
              <p className="text-sm text-slate-500 mt-1">
                We sent a sign-in link to <span className="font-medium text-slate-700">{email}</span>
              </p>
              <button
                className="text-xs text-slate-400 hover:text-slate-600 mt-5 underline"
                onClick={() => { setSent(false); setEmail('') }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              {error && <p className="text-sm text-red-600 text-center mb-3">{error}</p>}

              {/* Magic link form */}
              <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
                <Button type="submit" size="lg" loading={loading} className="w-full">
                  Send magic link
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400">or</span>
                </div>
              </div>

              {/* Google */}
              <Button variant="secondary" size="lg" className="w-full mb-4" onClick={handleGoogleSSO}>
                <GoogleIcon />
                Continue with Google
              </Button>

              {/* Demo */}
              <Button
                variant="ghost"
                size="lg"
                className="w-full text-slate-500"
                onClick={handleDemoMode}
                loading={demoLoading}
              >
                ✦ Try with demo data
              </Button>
              <p className="text-xs text-slate-400 text-center mt-2">
                No account required · resets after 24 hours
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function KinlyLogo() {
  return (
    <svg width="60" height="54" viewBox="0 0 60 54" fill="none" className="mx-auto">
      {/* three dots: top-centre, lower-left, lower-right */}
      <circle cx="30" cy="10" r="6" fill="#E8392A" />
      <circle cx="14" cy="26" r="6" fill="#E8392A" />
      <circle cx="46" cy="26" r="6" fill="#E8392A" />
      {/* smile */}
      <path d="M8 38 Q30 56 52 38" stroke="#E8392A" strokeWidth="5.5" strokeLinecap="round" fill="none" />
    </svg>
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
