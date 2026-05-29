// ─── KinlyBar — universal action + chat bar ───────────────────────────────────
// Collapsed: single-line with rotating placeholder + voice mic.
// Expanded:  multi-turn Groq streaming chat that also EXECUTES actions —
//            adding calendar events, tasks, and family members directly from
//            natural language. Uses [ACTION:{...}] tags parsed from responses.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IconSparkles,
  IconMicrophone,
  IconX,
} from '@tabler/icons-react'
import { streamKinly } from '../../lib/assistant'
import {
  parseActionFromResponse,
  executeKinlyAction,
  buildActionSuffix,
} from '../../lib/kinlyActions'
import { useAuthStore } from '../../store/authStore'
import type { AssistantContext, Message } from '../../lib/assistant'
import type { Member } from '../../types'

// ── Placeholder sets (per page) ───────────────────────────────────────────────

const PLACEHOLDERS: Record<KinlyBarPage, string[]> = {
  today: [
    "Ask Kinly anything — schedule Lila's dentist, text the babysitter...",
    "Is Lila free this Saturday?",
    "Reschedule Maria's cleaning...",
    "What's on this weekend?",
    "Remind me before piano today...",
    "Move morning sync to 9:30...",
    "What does tomorrow look like?",
  ],
  calendar: [
    "Add Lila's soccer game Sunday 10am...",
    "Move Saturday dinner to 7:30...",
    "When is Lila free this week?",
    "Add piano every Tuesday at 4pm...",
    "Block Thursday afternoon...",
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

type ActionStatus = 'pending' | 'done' | 'error'

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Extra content below text (extraction panels, invite inputs, etc.) */
  extra?: React.ReactNode
  /** Action confirmation pill */
  actionStatus?: ActionStatus
  actionLabel?: string
}

export interface KinlyBarProps {
  page: KinlyBarPage
  /** AI context (member names, events, etc.) */
  context?: AssistantContext
  /** Overrides the context sub-label in the expanded header */
  contextLabel?: string
  /** Full Member objects — used to resolve member names to IDs when adding events */
  members?: Member[]
  /**
   * Called before the Groq request fires.
   * Return a ReactNode to inject into the Kinly bubble (e.g. extraction panel).
   */
  onBeforeQuery?: (text: string) => React.ReactNode | null | Promise<React.ReactNode | null>
  /** Expose the bar's open/focus function to the parent (e.g. AddCard) */
  onMountFocus?: (focusFn: () => void) => void
  /** Expose the prefill function (pre-populate input + open bar) */
  prefillRef?: React.MutableRefObject<((text: string) => void) | null>
  /** Called after an action is successfully executed (e.g. to reload data) */
  onActionExecuted?: (type: string) => void
  defaultOpen?: boolean
}

// ── Voice input hook ──────────────────────────────────────────────────────────

function useVoiceInput(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const recRef = useRef<unknown>(null)

  const supported = typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition

  function start() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR() as {
      lang: string
      continuous: boolean
      interimResults: boolean
      onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null
      onerror: (() => void) | null
      onend: (() => void) | null
      start: () => void
      stop: () => void
    }
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onTranscript(transcript)
    }
    rec.onerror = () => setListening(false)
    rec.onend   = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  function stop() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(recRef.current as any)?.stop()
    setListening(false)
  }

  return { listening, start, stop, supported }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KinlyBar({
  page,
  context = {},
  contextLabel,
  members = [],
  onBeforeQuery,
  onMountFocus,
  prefillRef,
  onActionExecuted,
  defaultOpen = false,
}: KinlyBarProps) {
  const familyId = useAuthStore((s) => s.familyId)

  const [open,      setOpen]      = useState(defaultOpen)
  const [messages,  setMessages]  = useState<ChatMsg[]>([])
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [promptIdx, setPromptIdx] = useState(0)
  const [promptVis, setPromptVis] = useState(true)

  const inputRef  = useRef<HTMLInputElement>(null)
  const abortRef  = useRef<AbortController | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)

  const placeholders = PLACEHOLDERS[page]
  const ctxLabel     = contextLabel ?? PAGE_CONTEXT_LABEL[page]

  // ── Voice input ──────────────────────────────────────────────────────────
  const voice = useVoiceInput((transcript) => {
    setInput(transcript)
    openBar()
    // Small delay so bar opens before we auto-submit
    setTimeout(() => inputRef.current?.focus(), 80)
  })

  // ── Rotate placeholders ──────────────────────────────────────────────────
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

  // ── ⌘K shortcut ─────────────────────────────────────────────────────────
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

  // ── Expose focus + prefill ───────────────────────────────────────────────
  const openBar = useCallback(() => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [])

  useEffect(() => { onMountFocus?.(openBar) }, [onMountFocus, openBar])

  const prefill = useCallback((text: string) => {
    setInput(text)
    openBar()
  }, [openBar])

  useEffect(() => {
    if (prefillRef) prefillRef.current = prefill
  }, [prefill, prefillRef])

  // ── Close bar ────────────────────────────────────────────────────────────
  function closeBar() {
    setOpen(false)
    abortRef.current?.abort()
    voice.stop()
  }

  // ── Click-outside to close ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeBar()
    }
    const tid = setTimeout(() => document.addEventListener('mousedown', handler), 120)
    return () => { clearTimeout(tid); document.removeEventListener('mousedown', handler) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Escape to close ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') closeBar()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll thread ───────────────────────────────────────────────────
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages])

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    // Optional pre-processing (e.g. Family page extraction panel)
    const extra = onBeforeQuery ? await onBeforeQuery(text) : null

    const userId = crypto.randomUUID()
    const botId  = crypto.randomUUID()
    const userMsg: ChatMsg      = { id: userId, role: 'user',      content: text }
    const assistantMsg: ChatMsg = { id: botId,  role: 'assistant', content: '', extra: extra ?? undefined }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    // Build history for Groq
    const history: Message[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    // Inject action format instructions + today's date
    const enrichedContext: AssistantContext = {
      ...context,
      systemSuffix: buildActionSuffix(),
    }

    let fullText = ''
    try {
      await streamKinly(
        history,
        enrichedContext,
        (chunk) => {
          fullText += chunk
          // Stream clean text (strip partial [ACTION:...] from display)
          const displayText = fullText.replace(/\[ACTION:[\s\S]*$/, '').trimEnd()
          setMessages((prev) => {
            const copy = [...prev]
            const last = copy[copy.length - 1]
            if (last && last.id === botId) {
              copy[copy.length - 1] = { ...last, content: displayText }
            }
            return copy
          })
        },
        abortRef.current.signal,
      )
    } catch {
      // abort or error — leave partial reply visible
    } finally {
      setStreaming(false)
    }

    // ── Parse and execute action from completed response ──────────────────
    const { cleanText, action } = parseActionFromResponse(fullText)

    // Finalize clean text
    setMessages((prev) => {
      const copy = [...prev]
      const last = copy[copy.length - 1]
      if (last && last.id === botId) {
        copy[copy.length - 1] = { ...last, content: cleanText }
      }
      return copy
    })

    if (action && familyId) {
      // Show pending pill
      setMessages((prev) => {
        const copy = [...prev]
        const last = copy[copy.length - 1]
        if (last && last.id === botId) {
          copy[copy.length - 1] = { ...last, actionStatus: 'pending' }
        }
        return copy
      })

      try {
        const resultLabel = await executeKinlyAction(action, familyId, members)
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last && last.id === botId) {
            copy[copy.length - 1] = { ...last, actionStatus: 'done', actionLabel: resultLabel }
          }
          return copy
        })
        onActionExecuted?.(action.type)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not complete that'
        setMessages((prev) => {
          const copy = [...prev]
          const last = copy[copy.length - 1]
          if (last && last.id === botId) {
            copy[copy.length - 1] = { ...last, actionStatus: 'error', actionLabel: msg }
          }
          return copy
        })
      }
    }
  }

  // ── Mic button handler ───────────────────────────────────────────────────
  function handleMic(e: React.MouseEvent) {
    e.stopPropagation()
    if (voice.listening) {
      voice.stop()
    } else {
      openBar()
      voice.start()
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapRef}
      style={{
        background:   '#1A1A18',
        borderBottom: '0.5px solid #2C2C2A',
        flexShrink:   0,
        position:     'relative',
        zIndex:       30,
        padding:      open ? '10px 0' : '11px 0',
      }}
    >
      {/* Inner centred container — matches TopNav max-w-[1200px] */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>

        {/* ── Collapsed ─────────────────────────────────────────────────── */}
        {!open && (
          <div
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:           8,
              background:   'rgba(255,255,255,0.08)',
              border:       '0.5px solid rgba(255,255,255,0.14)',
              borderRadius:  8,
              padding:      '8px 12px',
              cursor:       'text',
            }}
            onClick={openBar}
          >
            {/* Amber circle with sparkle */}
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: '#E8A44A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <IconSparkles size={10} color="#fff" />
            </div>
            <span
              style={{
                flex:       1,
                fontSize:   12,
                color:      'rgba(255,255,255,0.38)',
                transition: 'opacity 300ms',
                opacity:     promptVis ? 1 : 0,
                userSelect: 'none',
              }}
            >
              {placeholders[promptIdx]}
            </span>
            {/* Mic — visible in collapsed state */}
            <button
              onClick={handleMic}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 0 }}
              title="Voice input"
            >
              <IconMicrophone
                size={14}
                color={voice.listening ? '#E8A44A' : 'rgba(255,255,255,0.25)'}
                style={{ flexShrink: 0 }}
                className={voice.listening ? 'animate-pulse' : ''}
              />
            </button>
          </div>
        )}

        {/* ── Expanded ──────────────────────────────────────────────────── */}
        {open && (
          <div className="kinly-ring ring-focused">
          <div
            style={{
              background:  '#ffffff',
              borderRadius: 13,
              overflow:    'hidden',
              boxShadow:   '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {/* Header */}
            <div
              style={{
                background:    '#FDFCF9',
                padding:       '10px 14px',
                borderBottom:  '0.5px solid #EEEDE8',
                display:       'flex',
                alignItems:    'center',
                justifyContent:'space-between',
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
                  padding:    14,
                  display:    'flex',
                  flexDirection: 'column',
                  gap:        12,
                  maxHeight:  280,
                  overflowY:  'auto',
                }}
              >
                {messages.map((msg) =>
                  msg.role === 'user' ? (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div
                        style={{
                          background:   '#1A1A18',
                          borderRadius: '10px 0 10px 10px',
                          padding:      '9px 12px',
                          maxWidth:     '80%',
                          fontSize:     12,
                          color:        '#F7F4EF',
                          lineHeight:   1.5,
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
                          width: 20, height: 20, borderRadius: 7, background: '#EEEDFE',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, marginTop: 2,
                        }}
                      >
                        <IconSparkles size={11} color="#534AB7" />
                      </div>
                      {/* Bubble */}
                      <div style={{ maxWidth: '88%' }}>
                        <div
                          style={{
                            background:   '#F7F4EF',
                            border:       '0.5px solid #EEEDE8',
                            borderRadius: '0 10px 10px 10px',
                            padding:      '9px 12px',
                            fontSize:     12,
                            color:        '#1A1A18',
                            lineHeight:   1.5,
                          }}
                        >
                          {/* Message text */}
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

                          {/* Extra content (extraction panels, etc.) */}
                          {msg.extra}

                          {/* Action status pill */}
                          {msg.actionStatus && (
                            <div style={{ marginTop: 8 }}>
                              {msg.actionStatus === 'pending' && (
                                <span
                                  className="animate-pulse"
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    fontSize: 10, color: '#534AB7',
                                    background: '#EEEDFE', borderRadius: 5, padding: '3px 8px',
                                  }}
                                >
                                  <IconSparkles size={9} color="#534AB7" />
                                  Saving…
                                </span>
                              )}
                              {msg.actionStatus === 'done' && (
                                <span
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    fontSize: 10, color: '#085041',
                                    background: '#E1F5EE', borderRadius: 5, padding: '3px 8px',
                                  }}
                                >
                                  ✓ {msg.actionLabel}
                                </span>
                              )}
                              {msg.actionStatus === 'error' && (
                                <span
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    fontSize: 10, color: '#712B13',
                                    background: '#F5C4B3', borderRadius: 5, padding: '3px 8px',
                                  }}
                                >
                                  × {msg.actionLabel}
                                </span>
                              )}
                            </div>
                          )}
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
                padding:     '8px 10px',
                borderTop:   messages.length > 0 ? '0.5px solid #F3F0EA' : 'none',
                display:     'flex',
                alignItems:  'center',
                gap:          8,
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
                value={voice.listening ? '' : input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  voice.listening
                    ? 'Listening…'
                    : streaming
                    ? 'Kinly is thinking…'
                    : placeholders[promptIdx]
                }
                disabled={streaming || voice.listening}
                style={{
                  flex:      1,
                  background: 'none',
                  border:    'none',
                  outline:   'none',
                  fontSize:  12,
                  fontStyle: input && !voice.listening ? 'normal' : 'italic',
                  color:     voice.listening ? '#EF9F27' : '#1A1A18',
                }}
              />
              {/* Mic button */}
              <button
                type="button"
                onClick={handleMic}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 0, flexShrink: 0 }}
                title={voice.listening ? 'Stop listening' : 'Voice input'}
              >
                <IconMicrophone
                  size={14}
                  color={voice.listening ? '#EF9F27' : '#C4C2BA'}
                  className={voice.listening ? 'animate-pulse' : ''}
                />
              </button>
            </form>
          </div>
          </div>
        )}

      {/* Listening indicator below bar */}
      {voice.listening && (
        <div
          style={{
            display:     'flex',
            alignItems:  'center',
            gap:          6,
            marginTop:    6,
            paddingLeft:  4,
          }}
        >
          <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF9F27', display: 'block' }} />
          <span style={{ fontSize: 11, color: '#EF9F27' }}>Listening — speak now</span>
        </div>
      )}
      </div>{/* end inner centred container */}
    </div>
  )
}
