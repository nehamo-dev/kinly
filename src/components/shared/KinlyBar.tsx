// ─── KinlyBar — universal chat bar ───────────────────────────────────────────
// Appears on every page with an animated gradient ring.
// Collapsed: single-line with rotating placeholder.
// Expanded:  multi-turn Groq chat panel (overlay, not push).

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IconSparkles,
  IconMicrophone,
  IconX,
} from '@tabler/icons-react'
import { streamKinly } from '../../lib/assistant'
import type { AssistantContext, Message } from '../../lib/assistant'

// ── Placeholder sets (per page) ───────────────────────────────────────────────

const PLACEHOLDERS: Record<KinlyBarPage, string[]> = {
  today: [
    "Is Lila free this Saturday?",
    "Reschedule Maria's cleaning...",
    "What's on this weekend?",
    "Remind me before piano today...",
    "Move morning sync to 9:30...",
    "What does tomorrow look like?",
    "Add a note about Lila's recital...",
  ],
  calendar: [
    "Move Saturday dinner to 7:30...",
    "Add Lila's soccer game Sunday 10am...",
    "When is Lila free this week?",
    "Clear Thursday afternoon...",
    "Add piano every Tuesday at 4pm...",
    "Is there anything on June 5?",
    "Remind me about the recital next week...",
  ],
  family: [
    "Add my mum, she helps with school pickup...",
    "Lila is actually 9 now...",
    "Invite my partner to join Kinly...",
    "What do you know about Lila?",
    "Remove Jake from the family...",
    "Add my sister Sarah, she babysits...",
    "Update Jake's email address...",
  ],
  home: [
    "Maria's cleaning is overdue...",
    "Add a weekly grocery reminder...",
    "When did we last service the HVAC?",
    "Remind me to pay the electricity bill...",
    "Add a new home task...",
    "What's outstanding at home?",
    "Schedule a plumber for next week...",
  ],
  inbox: [
    "Draft a reply to Cedar Crest...",
    "Summarise what I missed this week...",
    "Is there anything urgent in my inbox?",
    "Archive everything older than 2 weeks...",
    "What did the school email say?",
    "Flag Jake's message for later...",
    "Find the email about soccer registration...",
  ],
}

const PAGE_CONTEXT_LABEL: Record<KinlyBarPage, string> = {
  today:    'Your day',
  calendar: 'Your calendar',
  family:   'Building your family profiles',
  home:     'Your home',
  inbox:    'Your inbox',
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type KinlyBarPage = 'today' | 'calendar' | 'family' | 'home' | 'inbox'

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Optional extra content (e.g. extraction panel) rendered below the text */
  extra?: React.ReactNode
}

export interface KinlyBarProps {
  page: KinlyBarPage
  /** AI context injected into every request */
  context?: AssistantContext
  /** Overrides the default context sub-label shown in expanded header */
  contextLabel?: string
  /**
   * Called with the user's raw text before the Groq request fires.
   * May return a ReactNode that gets appended inside the Kinly bubble
   * (use for extraction panels, invite inputs, etc.).
   */
  onBeforeQuery?: (
    text: string,
  ) => React.ReactNode | null | Promise<React.ReactNode | null>
  /** Expose the bar's focus/open function to the parent (e.g. AddCard click) */
  onMountFocus?: (focusFn: () => void) => void
  /** Expose the bar's prefill function (pre-populate input + open bar) */
  prefillRef?: React.MutableRefObject<((text: string) => void) | null>
  defaultOpen?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KinlyBar({
  page,
  context = {},
  contextLabel,
  onBeforeQuery,
  onMountFocus,
  prefillRef,
  defaultOpen = false,
}: KinlyBarProps) {
  const [open,       setOpen]       = useState(defaultOpen)
  const [messages,   setMessages]   = useState<ChatMsg[]>([])
  const [input,      setInput]      = useState('')
  const [streaming,  setStreaming]  = useState(false)
  const [promptIdx,  setPromptIdx]  = useState(0)
  const [promptVis,  setPromptVis]  = useState(true)

  const inputRef  = useRef<HTMLInputElement>(null)
  const abortRef  = useRef<AbortController | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)

  const placeholders = PLACEHOLDERS[page]
  const ctxLabel     = contextLabel ?? PAGE_CONTEXT_LABEL[page]

  // ── Rotate placeholders every 2.6s ────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setPromptVis(false)
      setTimeout(() => {
        setPromptIdx((i) => (i + 1) % placeholders.length)
        setPromptVis(true)
      }, 300)
    }, 2600)
    return () => clearInterval(id)
  }, [placeholders.length])

  // ── ⌘K shortcut ───────────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openBar()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Expose focus fn to parent ──────────────────────────────────────────────
  const openBar = useCallback(() => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [])

  useEffect(() => {
    onMountFocus?.(openBar)
  }, [onMountFocus, openBar])

  function closeBar() {
    setOpen(false)
    abortRef.current?.abort()
  }

  // ── Click-outside to close ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        closeBar()
      }
    }
    const tid = setTimeout(() => document.addEventListener('mousedown', handler), 120)
    return () => {
      clearTimeout(tid)
      document.removeEventListener('mousedown', handler)
    }
  }, [open])

  // ── Escape to close ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') closeBar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // ── Auto-scroll thread to bottom ──────────────────────────────────────────
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages])

  // ── Submit handler ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    // Optional pre-processing (extraction panels, etc.)
    const extra = onBeforeQuery ? await onBeforeQuery(text) : null

    const userId  = crypto.randomUUID()
    const botId   = crypto.randomUUID()
    const userMsg: ChatMsg      = { id: userId, role: 'user',      content: text }
    const assistantMsg: ChatMsg = { id: botId,  role: 'assistant', content: '', extra: extra ?? undefined }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    // Build history for Groq (text content only)
    const history: Message[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      let full = ''
      await streamKinly(
        history,
        context,
        (chunk) => {
          full += chunk
          setMessages((prev) => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            if (last && last.id === botId) {
              copy[copy.length - 1] = { ...last, content: full }
            }
            return copy
          })
        },
        abortRef.current.signal,
      )
    } catch {
      // abort or network error — leave partial reply visible
    } finally {
      setStreaming(false)
    }
  }

  // ── Prepopulate input and open (for dots-menu "Edit/Remove" prefills) ──────
  const prefill = useCallback((text: string) => {
    setInput(text)
    openBar()
  }, [openBar])

  // Expose prefill via ref so parent can call it directly
  useEffect(() => {
    if (prefillRef) prefillRef.current = prefill
  }, [prefill, prefillRef])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapRef}
      style={{
        background: '#F7F4EF',
        padding: '10px 28px',
        borderBottom: '0.5px solid #E8E4DC',
        flexShrink: 0,
        position: 'relative',
        zIndex: 30,
      }}
    >
      <div className={`kinly-ring${open ? ' ring-focused' : ''}`}>

        {/* ── Collapsed ─────────────────────────────────────────────────── */}
        {!open && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 11.5,
              padding: '10px 13px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'text',
            }}
            onClick={openBar}
          >
            <IconSparkles size={14} color="#AFA9EC" style={{ flexShrink: 0 }} />
            <span
              style={{
                flex: 1,
                fontSize: 12,
                fontStyle: 'italic',
                color: '#B4B2A9',
                transition: 'opacity 300ms',
                opacity: promptVis ? 1 : 0,
                userSelect: 'none',
              }}
            >
              {placeholders[promptIdx]}
            </span>
            <span
              style={{
                fontSize: 9,
                color: '#C4C2BA',
                background: '#F3F1EC',
                border: '0.5px solid #D3D1C7',
                borderRadius: 3,
                padding: '2px 5px',
                flexShrink: 0,
                fontFamily: 'inherit',
              }}
            >
              ⌘K
            </span>
            <IconMicrophone size={14} color="#C4C2BA" style={{ flexShrink: 0 }} />
          </div>
        )}

        {/* ── Expanded ──────────────────────────────────────────────────── */}
        {open && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 13,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {/* Header */}
            <div
              style={{
                background: '#FDFCF9',
                padding: '10px 14px',
                borderBottom: '0.5px solid #EEEDE8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconSparkles size={13} color="#AFA9EC" />
                <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1A18' }}>Kinly</span>
                <span style={{ fontSize: 11, color: '#B4B2A9' }}>· {ctxLabel}</span>
              </div>
              <button
                onClick={closeBar}
                style={{ padding: 2, lineHeight: 0, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <IconX size={15} color="#C4C2BA" />
              </button>
            </div>

            {/* Chat thread */}
            {messages.length > 0 && (
              <div
                ref={threadRef}
                style={{
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  maxHeight: 280,
                  overflowY: 'auto',
                }}
              >
                {messages.map((msg) =>
                  msg.role === 'user' ? (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div
                        style={{
                          background: '#1A1A18',
                          borderRadius: '10px 0 10px 10px',
                          padding: '9px 12px',
                          maxWidth: '80%',
                          fontSize: 12,
                          color: '#F7F4EF',
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div key={msg.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      {/* Kinly avatar */}
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 7,
                          background: '#EEEDFE',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <IconSparkles size={11} color="#534AB7" />
                      </div>
                      {/* Bubble */}
                      <div style={{ maxWidth: '88%' }}>
                        <div
                          style={{
                            background: '#F7F4EF',
                            border: '0.5px solid #EEEDE8',
                            borderRadius: '0 10px 10px 10px',
                            padding: '9px 12px',
                            fontSize: 12,
                            color: '#1A1A18',
                            lineHeight: 1.5,
                          }}
                        >
                          {msg.content
                            ? msg.content
                            : streaming && (
                                <span
                                  className="animate-pulse"
                                  style={{ opacity: 0.5, fontStyle: 'italic' }}
                                >
                                  thinking…
                                </span>
                              )
                          }
                          {msg.extra}
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {/* Active input */}
            <form
              onSubmit={handleSubmit}
              style={{
                padding: '8px 10px',
                borderTop: messages.length > 0 ? '0.5px solid #F3F0EA' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <IconSparkles
                size={14}
                color="#AFA9EC"
                style={{ flexShrink: 0 }}
                className={streaming ? 'animate-pulse' : ''}
              />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={streaming ? 'Kinly is thinking...' : placeholders[promptIdx]}
                disabled={streaming}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: 12,
                  fontStyle: input ? 'normal' : 'italic',
                  color: '#1A1A18',
                }}
              />
              <IconMicrophone size={14} color="#C4C2BA" style={{ flexShrink: 0 }} />
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
