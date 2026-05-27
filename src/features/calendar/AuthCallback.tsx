import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { exchangeCodeForTokens } from '../../lib/google'
import { useAuthStore } from '../../store/authStore'

export function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const familyId = useAuthStore((s) => s.familyId)
  const user = useAuthStore((s) => s.user)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state') // 'onboarding' | 'settings' | null

    if (!code) {
      // Might be a Supabase auth callback (no code param means likely a hash-based callback)
      navigate('/')
      return
    }

    async function handleCode() {
      try {
        const tokens = await exchangeCodeForTokens(code!)
        const expiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

        if (familyId && user) {
          await supabase.from('google_connections').upsert({
            user_id: user.id,
            family_id: familyId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expiry: expiry,
            calendar_connected: true,
            gmail_connected: false,
          }, { onConflict: 'user_id,family_id' })
        }

        // Redirect back
        navigate(state === 'settings' ? '/settings/calendar' : '/')
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Authentication failed')
      }
    }

    handleCode()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button
            className="text-sm text-[#1D9E75] hover:underline"
            onClick={() => navigate('/')}
          >
            Go home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Connecting your calendar…</p>
      </div>
    </div>
  )
}
