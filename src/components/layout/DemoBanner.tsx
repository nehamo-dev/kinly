import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { clearDemoState } from '../../lib/demoLocal'

export function DemoBanner() {
  const isDemo = useAuthStore((s) => s.isDemo)
  const [dismissed, setDismissed] = useState(false)
  const navigate = useNavigate()

  if (!isDemo || dismissed) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="max-w-[860px] mx-auto flex items-center justify-between gap-4">
        <p className="text-sm text-amber-800">
          <span className="font-medium">You're in demo mode.</span>{' '}
          Your data resets after 24 hours.{' '}
          <button
            className="underline font-medium hover:text-amber-900"
            onClick={() => { clearDemoState(); navigate('/welcome') }}
          >
            Sign up to save your data →
          </button>
        </p>
        <button
          className="text-amber-600 hover:text-amber-800 flex-shrink-0"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss demo banner"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
        </button>
      </div>
    </div>
  )
}
