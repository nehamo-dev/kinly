import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { clearDemoState } from '../../lib/demoLocal'

export function DemoBanner() {
  const isDemo = useAuthStore((s) => s.isDemo)
  const [dismissed, setDismissed] = useState(false)
  const navigate = useNavigate()

  if (!isDemo || dismissed) return null

  return (
    <div style={{ background: '#2C2C2A', borderBottom: '1px solid #3a3a38' }} className="px-4 py-2">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
        <p className="text-xs" style={{ color: '#888780' }}>
          <span style={{ color: '#B4B2A9' }}>Demo mode.</span>{' '}
          Data resets after 24 hours.{' '}
          <button
            className="underline hover:opacity-80 transition-opacity"
            style={{ color: '#EF9F27' }}
            onClick={() => {
              clearDemoState()
              try { localStorage.removeItem('kinly-family-id') } catch {}
              // Only sign out if there's actually a Supabase session to clear
              if (useAuthStore.getState().session) {
                supabase.auth.signOut().catch(() => {})
              }
              useAuthStore.getState().clear()
              navigate('/welcome')
            }}
          >
            Sign up to save your data →
          </button>
        </p>
        <button
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          style={{ color: '#5F5E5A' }}
          onClick={() => setDismissed(true)}
          aria-label="Dismiss demo banner"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
        </button>
      </div>
    </div>
  )
}
