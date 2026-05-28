import { useEffect, useRef, useState } from 'react'
import {
  IconCar, IconMusic, IconHeart, IconCalendar, IconSparkles, IconMicrophone,
} from '@tabler/icons-react'
import type { FamilyEvent, Member } from '../../types'

const PLACEHOLDERS = [
  'Is Lila free this Saturday?',
  'Reschedule Maria\'s cleaning...',
  'Draft a reply to Cedar Crest...',
  'What\'s on this weekend?',
  'Remind me before piano today...',
  'Move morning sync to 9:30...',
  'Find a babysitter for Friday...',
]

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function chipIcon(title: string) {
  const t = title.toLowerCase()
  if (t.includes('pickup') || t.includes('drive') || t.includes('car')) return <IconCar size={11} />
  if (t.includes('piano') || t.includes('music') || t.includes('lesson')) return <IconMusic size={11} />
  if (t.includes('anniversary') || t.includes('date') || t.includes('dinner')) return <IconHeart size={11} />
  return <IconCalendar size={11} />
}

function chipLabel(event: FamilyEvent): string {
  const title = event.title.toLowerCase()
  if (title.includes('pickup')) return `pickup ${fmtTime(event.time_start)}`
  if (title.includes('piano')) return `piano ${fmtTime(event.time_start)}`
  if (title.includes('anniversary')) return 'anniversary Sat'
  if (title.includes('sync')) return `sync ${fmtTime(event.time_start)}`
  return `${event.title.split(' ')[0].toLowerCase()} ${fmtTime(event.time_start)}`
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

function getHeadline(tasks: number, events: number): string {
  if (tasks === 0 && events === 0) return 'Nothing urgent today.'
  if (tasks === 1) return 'One thing needs you.'
  if (tasks === 2) return 'Two things need you.'
  if (tasks >= 3) return `${tasks} things need attention.`
  if (events > 0) return `${events} thing${events > 1 ? 's' : ''} on the calendar.`
  return 'You\'re all caught up.'
}

interface HeroHeaderProps {
  events: FamilyEvent[]
  members: Member[]
  taskCount: number
  onQuery: (q: string) => void
  selectedEventId?: string | null
  onChipClick?: (eventId: string | null) => void
}

export function HeroHeader({ events, taskCount, onQuery, selectedEventId, onChipClick }: HeroHeaderProps) {
  const [value, setValue] = useState('')
  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Rotate placeholder every 2.6s with fade
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length)
        setVisible(true)
      }, 300)
    }, 2600)
    return () => clearInterval(id)
  }, [])

  function handleSubmit() {
    const q = value.trim()
    if (!q) return
    onQuery(q)
    setValue('')
  }

  // Chips from today's events (max 4)
  const chips = events.slice(0, 4)

  return (
    <div className="w-full" style={{ background: '#1A1A18' }}>
      <div className="max-w-[1200px] mx-auto px-6 py-5 flex flex-col gap-3">

        {/* Greeting */}
        <div>
          <h1 className="text-[20px] md:text-[24px] font-[500] leading-tight tracking-[-0.5px]" style={{ color: '#F7F4EF' }}>
            {getGreeting()}. {getHeadline(taskCount, events.length)}
          </h1>
        </div>

        {/* Day strip — horizontally scrollable on mobile */}
        {chips.length > 0 && (
          <div
            className="flex items-center gap-1.5 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {chips.map((e) => {
              const active = selectedEventId === e.id
              return (
                <span
                  key={e.id}
                  className="flex items-center gap-1.5 rounded-full text-[11px] font-medium flex-shrink-0 px-2.5 py-1 cursor-pointer transition-all"
                  style={{
                    background: active ? '#EF9F27' : '#2C2C2A',
                    color:      active ? '#1A1A18' : '#888780',
                  }}
                  onClick={() => onChipClick?.(active ? null : e.id)}
                >
                  {chipIcon(e.title)}
                  {chipLabel(e)}
                </span>
              )
            })}
          </div>
        )}

        {/* Input bar */}
        <div
          className="flex items-center gap-2 rounded-[10px] px-3.5 py-2.5"
          style={{ background: '#2C2C2A' }}
          onClick={() => inputRef.current?.focus()}
        >
          <IconSparkles size={16} style={{ color: '#5F5E5A', flexShrink: 0 }} />

          {/* Input + floating placeholder */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full bg-transparent text-[13px] focus:outline-none"
              style={{ color: '#F7F4EF' }}
            />
            {!value && (
              <span
                className="absolute inset-0 pointer-events-none text-[13px] italic transition-opacity duration-300 select-none flex items-center"
                style={{ color: '#5F5E5A', opacity: visible ? 1 : 0 }}
              >
                {PLACEHOLDERS[placeholderIdx]}
              </span>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); handleSubmit() }}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
            style={{ color: '#5F5E5A' }}
            aria-label="Voice input"
          >
            <IconMicrophone size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
