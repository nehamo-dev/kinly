import { useState } from 'react'
import { IconSend, IconSparkles } from '@tabler/icons-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { seedDemoFamily } from '../../lib/demo'

// ── Welcome — two-column sign-in page ─────────────────────────────────────────
// Left:  dark brand panel (#1A1A18) — logo · tagline · trust badge
// Right: warm form panel (#F7F4EF) — Google · email · magic link · demo

export function Welcome() {
  const [email,       setEmail]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoStatus,  setDemoStatus]  = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [sent,        setSent]        = useState(false)

  const navigate    = useNavigate()
  const setFamilyId = useAuthStore((s) => s.setFamilyId)
  const setIsDemo   = useAuthStore((s) => s.setIsDemo)

  // ── Handlers ────────────────────────────────────────────────────────────────

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
    setDemoStatus('Starting demo…')
    setError(null)

    // After 5 s without a response, tell the user the server is waking up.
    // Supabase free tier can take 20-30 s to resume from a paused state.
    const slowTimer = setTimeout(() => setDemoStatus('Server waking up (~30s on first load)…'), 5000)

    try {
      await Promise.race([
        (async () => {
          const { data, error: authErr } = await supabase.auth.signInAnonymously()
          if (authErr || !data.user) throw authErr || new Error('Sign-in failed')

          setDemoStatus('Building your family…')
          const familyId = await seedDemoFamily(data.user.id)

          try { localStorage.setItem('kinly-family-id', familyId) } catch {}
          setFamilyId(familyId)
          setIsDemo(true)
          navigate('/')
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 45000)
        ),
      ])
    } catch (err) {
      const msg = (err as Error)?.message ?? ''
      console.error('[Kinly] Demo setup failed:', err)
      if (msg === 'TIMEOUT') {
        setError('Server is still warming up. Wait 30 s and try again.')
      } else {
        setError('Demo setup failed — please try again')
      }
      setDemoLoading(false)
      setDemoStatus(null)
    } finally {
      clearTimeout(slowTimer)
    }
  }

  return (
    // Two-column grid at md+; single column on mobile
    <div className="min-h-screen md:grid md:grid-cols-2">

      {/* ── Left panel — dark brand ──────────────────────────────────────── */}
      <div
        className="flex flex-col justify-between"
        style={{
          background: '#1A1A18',
          padding: '48px 44px',
          // On mobile: compact bar, not full panel
          minHeight: 'var(--left-panel-height, auto)',
        }}
      >
        {/* Logo — wordmark + amber dot */}
        <div>
          <span
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: '#F7F4EF',
              letterSpacing: '-0.4px',
            }}
          >
            kinly
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#EF9F27',
                verticalAlign: 'middle',
                marginLeft: 2,
                marginBottom: 2,
              }}
            />
          </span>
        </div>

        {/* Tagline — hidden on mobile to keep the bar compact */}
        <div className="hidden md:block">
          <p
            style={{
              fontSize: 30,
              fontWeight: 500,
              color: '#F7F4EF',
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
              marginBottom: 14,
            }}
          >
            For families who have{' '}
            <em style={{ color: '#EF9F27', fontStyle: 'normal' }}>a lot</em>{' '}
            going on.
          </p>
          <p
            style={{
              fontSize: 14,
              color: '#5F5E5A',
              lineHeight: 1.7,
            }}
          >
            Everything in one place — calendar, tasks, school, home. Kinly
            handles the follow-through so you don't have to.
          </p>
        </div>

        {/* Trust badge — hidden on mobile */}
        <p className="hidden md:block" style={{ fontSize: 11, color: '#3A3A38' }}>
          Trusted by 10,000+ families
        </p>
      </div>

      {/* ── Right panel — form ───────────────────────────────────────────── */}
      <div
        className="flex items-center justify-center"
        style={{
          background: '#F7F4EF',
          padding: '48px 44px',
          flex: 1,
        }}
      >
        <div style={{ maxWidth: 340, width: '100%' }}>

          {/* Heading */}
          <h1
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#1A1A18',
              letterSpacing: '-0.4px',
              marginBottom: 6,
            }}
          >
            Welcome to Kinly.
          </h1>
          <p
            style={{
              fontSize: 13,
              color: '#888780',
              lineHeight: 1.5,
              marginBottom: 28,
            }}
          >
            Sign in or create your account — takes about 60 seconds.
          </p>

          {/* Error */}
          {error && (
            <p
              className="text-center mb-4"
              style={{ fontSize: 13, color: '#E8392A' }}
            >
              {error}
            </p>
          )}

          {/* Google CTA */}
          <button
            onClick={handleGoogleSSO}
            className="flex items-center justify-center gap-2.5 w-full transition-colors"
            style={{
              background: '#fff',
              border: '1px solid #D3D1C7',
              borderRadius: 10,
              padding: '12px 16px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F0EEE8')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <GoogleIcon />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A18' }}>
              Continue with Google
            </span>
          </button>

          {/* Divider */}
          <div
            className="flex items-center gap-3 my-5"
            style={{ color: '#B4B2A9' }}
          >
            <div style={{ flex: 1, height: '0.5px', background: '#D3D1C7' }} />
            <span style={{ fontSize: 11 }}>or use email</span>
            <div style={{ flex: 1, height: '0.5px', background: '#D3D1C7' }} />
          </div>

          {/* Email + magic link */}
          <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 500,
                  color: '#5F5E5A',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full outline-none transition-colors"
                style={{
                  background: '#fff',
                  border: '1px solid #D3D1C7',
                  borderRadius: 10,
                  padding: '11px 14px',
                  fontSize: 13,
                  color: '#1A1A18',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#AFA9EC')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#D3D1C7')}
              />
            </div>

            {sent ? (
              <p
                className="text-center py-3"
                style={{ fontSize: 13, color: '#1D9E75' }}
              >
                Check your inbox — link sent ✓
              </p>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full transition-opacity"
                style={{
                  background: '#1A1A18',
                  color: '#F7F4EF',
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  border: 'none',
                }}
              >
                {loading ? (
                  <span
                    className="rounded-full animate-spin"
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid #F7F4EF',
                      borderTopColor: 'transparent',
                      display: 'inline-block',
                    }}
                  />
                ) : (
                  <IconSend size={15} />
                )}
                Send magic link
              </button>
            )}
          </form>

          {/* Demo section */}
          <div
            style={{
              borderTop: '0.5px solid #E8E4DC',
              marginTop: 20,
              paddingTop: 20,
            }}
          >
            <button
              onClick={handleDemoMode}
              disabled={demoLoading}
              className="flex items-center justify-center gap-2 w-full transition-opacity"
              style={{
                background: '#EEEDFE',
                color: '#534AB7',
                borderRadius: 8,
                padding: '11px 16px',
                fontSize: 13,
                fontWeight: 500,
                cursor: demoLoading ? 'not-allowed' : 'pointer',
                opacity: demoLoading ? 0.7 : 1,
                border: 'none',
              }}
            >
              {demoLoading ? (
                <span
                  className="rounded-full animate-spin"
                  style={{
                    width: 12,
                    height: 12,
                    border: '2px solid #534AB7',
                    borderTopColor: 'transparent',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <IconSparkles size={14} />
              )}
              {demoLoading ? (demoStatus ?? 'Starting demo…') : "See it with a real family's week"}
            </button>
            <p
              className="text-center"
              style={{ fontSize: 11, color: '#B4B2A9', marginTop: 6 }}
            >
              No account needed · resets after 24 hours
            </p>
          </div>

          {/* Terms */}
          <p
            className="text-center"
            style={{ fontSize: 11, color: '#C4C2BA', marginTop: 20 }}
          >
            By continuing you agree to our{' '}
            <a
              href="#"
              style={{ color: '#B4B2A9', textDecoration: 'underline' }}
            >
              Terms
            </a>{' '}
            and{' '}
            <a
              href="#"
              style={{ color: '#B4B2A9', textDecoration: 'underline' }}
            >
              Privacy Policy
            </a>
            . We never sell your data. Ever.
          </p>

        </div>
      </div>
    </div>
  )
}

// ── Inline sub-components ─────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
