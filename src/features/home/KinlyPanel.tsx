// ─── KinlyPanel ───────────────────────────────────────────────────────────────
// Appears directly below HeroHeader when a query is submitted.
// Shows a streaming-style response from the Groq assistant.

import { useEffect, useState } from 'react'
import { IconSparkles, IconX } from '@tabler/icons-react'
import { askKinly } from '../../lib/assistant'
import type { AssistantContext } from '../../lib/assistant'

interface KinlyPanelProps {
  query: string
  context?: AssistantContext
  onClose: () => void
}

export function KinlyPanel({ query, context, onClose }: KinlyPanelProps) {
  const [answer,  setAnswer]  = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!query) return
    setLoading(true)
    setAnswer('')
    setError(null)

    askKinly(query, context ?? {})
      .then((text) => { setAnswer(text); setLoading(false) })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Something went wrong.'
        setError(msg)
        setLoading(false)
      })
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="w-full border-b"
      style={{
        background: '#1E1E1C',
        borderColor: '#2C2C2A',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-4">
        {/* Query echo */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <p className="text-[12px] italic" style={{ color: '#5F5E5A' }}>
            "{query}"
          </p>
          <button
            onClick={onClose}
            className="flex-shrink-0 hover:opacity-70 transition-opacity mt-0.5"
            style={{ color: '#5F5E5A' }}
            aria-label="Dismiss"
          >
            <IconX size={14} />
          </button>
        </div>

        {/* Response */}
        <div className="flex items-start gap-2.5">
          <IconSparkles
            size={14}
            style={{ color: '#AFA9EC', flexShrink: 0, marginTop: 2 }}
          />
          {loading ? (
            <div className="flex gap-1 items-center" style={{ paddingTop: 4 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 5,
                    height: 5,
                    background: '#5F5E5A',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          ) : error ? (
            <p className="text-[12px]" style={{ color: '#F5C4B3' }}>
              {error.includes('VITE_GROQ_API_KEY')
                ? 'Add VITE_GROQ_API_KEY to .env.local to enable Kinly AI.'
                : error}
            </p>
          ) : (
            <p
              className="text-[13px] leading-relaxed"
              style={{ color: '#F7F4EF' }}
            >
              {answer}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
