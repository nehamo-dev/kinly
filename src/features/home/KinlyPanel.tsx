// ─── KinlyPanel ───────────────────────────────────────────────────────────────
// Slides in below HeroHeader. Shows a streaming multi-turn conversation.
// - query prop triggers the first message (from hero input or ActionCard)
// - Follow-up input at the bottom extends the conversation
// - Each assistant message streams in character-by-character

import { useEffect, useRef, useState, useCallback } from 'react'
import { IconSparkles, IconX, IconSend } from '@tabler/icons-react'
import { streamKinly } from '../../lib/assistant'
import type { AssistantContext, Message } from '../../lib/assistant'

interface ConvMessage extends Message {
  id: string
}

let _msgId = 0
function newId() { return String(++_msgId) }

interface KinlyPanelProps {
  query: string
  context?: AssistantContext
  onClose: () => void
}

export function KinlyPanel({ query, context, onClose }: KinlyPanelProps) {
  const [messages,    setMessages]    = useState<ConvMessage[]>([])
  const [followUp,    setFollowUp]    = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const abortRef   = useRef<AbortController | null>(null)
  const scrollRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // ── Run a stream ─────────────────────────────────────────────────────────
  const runStream = useCallback(
    async (history: Message[]) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      // Placeholder for the assistant reply
      const assistantId = newId()
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '' },
      ])
      setIsStreaming(true)
      setError(null)

      try {
        await streamKinly(
          history,
          context ?? {},
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + chunk }
                  : m,
              ),
            )
          },
          ctrl.signal,
        )
      } catch (err: unknown) {
        const errName = (err as Error)?.name ?? ''
        const errMsg  = (err as Error)?.message ?? ''
        if (errName === 'AbortError' || errName === 'APIUserAbortError' || errMsg.includes('aborted')) return
        setError(
          errMsg.includes('VITE_GROQ_API_KEY')
            ? 'Add VITE_GROQ_API_KEY to .env.local to enable Kinly AI.'
            : (errMsg || 'Something went wrong.'),
        )
        // Remove the empty placeholder on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      } finally {
        setIsStreaming(false)
      }
    },
    [context],
  )

  // ── New query prop → reset conversation ──────────────────────────────────
  useEffect(() => {
    if (!query) return
    const userMsg: ConvMessage = { id: newId(), role: 'user', content: query }
    setMessages([userMsg])
    setError(null)
    runStream([{ role: 'user', content: query }])
    return () => abortRef.current?.abort()
  }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // ── Submit follow-up ──────────────────────────────────────────────────────
  function handleFollowUp(e: React.FormEvent) {
    e.preventDefault()
    const q = followUp.trim()
    if (!q || isStreaming) return
    setFollowUp('')

    const userMsg: ConvMessage = { id: newId(), role: 'user', content: q }
    setMessages((prev) => {
      const updated = [...prev, userMsg]
      // Build history from all non-empty messages
      const history: Message[] = updated
        .filter((m) => m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }))
      runStream(history)
      return updated
    })
  }

  return (
    <div
      className="w-full border-b"
      style={{ background: '#1E1E1C', borderColor: '#2C2C2A' }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-col gap-3">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <IconSparkles size={13} style={{ color: '#AFA9EC' }} />
            <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#5F5E5A' }}>
              Kinly
            </span>
          </div>
          <button
            onClick={onClose}
            className="hover:opacity-70 transition-opacity"
            style={{ color: '#5F5E5A' }}
            aria-label="Dismiss"
          >
            <IconX size={14} />
          </button>
        </div>

        {/* Conversation thread */}
        <div
          ref={scrollRef}
          className="flex flex-col gap-3 overflow-y-auto"
          style={{ maxHeight: 280 }}
        >
          {messages.map((msg, idx) => {
            const isLast     = idx === messages.length - 1
            const showCursor = isLast && msg.role === 'assistant' && isStreaming

            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <span
                    className="text-[12px] italic max-w-[80%] text-right"
                    style={{ color: '#5F5E5A' }}
                  >
                    "{msg.content}"
                  </span>
                </div>
              )
            }

            return (
              <div key={msg.id} className="flex items-start gap-2">
                <IconSparkles
                  size={13}
                  style={{ color: '#AFA9EC', flexShrink: 0, marginTop: 3 }}
                />
                <p
                  className="text-[13px] leading-relaxed flex-1"
                  style={{ color: '#F7F4EF' }}
                >
                  {msg.content || (
                    // Pulsing dots while waiting for first chunk
                    <span className="flex gap-1 items-center" style={{ paddingTop: 2 }}>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="rounded-full inline-block"
                          style={{
                            width: 5,
                            height: 5,
                            background: '#5F5E5A',
                            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </span>
                  )}
                  {showCursor && (
                    <span
                      className="inline-block ml-[1px] animate-pulse"
                      style={{
                        width: 1.5,
                        height: '0.9em',
                        background: '#AFA9EC',
                        verticalAlign: 'text-bottom',
                      }}
                    />
                  )}
                </p>
              </div>
            )
          })}

          {/* Error state */}
          {error && (
            <p className="text-[12px]" style={{ color: '#F5C4B3' }}>
              {error}
            </p>
          )}
        </div>

        {/* Follow-up input */}
        <form
          onSubmit={handleFollowUp}
          className="flex items-center gap-2 rounded-[8px] px-3 py-2"
          style={{ background: '#2C2C2A' }}
        >
          <input
            ref={inputRef}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder="Ask a follow-up…"
            disabled={isStreaming}
            className="flex-1 bg-transparent text-[12px] focus:outline-none"
            style={{ color: '#F7F4EF' }}
          />
          <button
            type="submit"
            disabled={!followUp.trim() || isStreaming}
            className="flex-shrink-0 transition-opacity disabled:opacity-30"
            style={{ color: '#AFA9EC' }}
            aria-label="Send"
          >
            <IconSend size={13} />
          </button>
        </form>

      </div>
    </div>
  )
}
