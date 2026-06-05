// ScheduleCard — full list (desktop) + ScheduleStrip — horizontal cards (tablet/mobile)

import type { FamilyEvent, Member } from '../../types'

// ── Shared helpers ─────────────────────────────────────────────────────────────

function fmtTime(t: string | null | undefined): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Demo fallback: title → first member name
const DEMO_MEMBER_MAP: Record<string, string> = {
  'School pickup — Lila': 'Lila',
  'Piano lesson':         'Lila',
  'Parent info night':    'Lila',
  "Soccer practice":      'Lila',
  "Lila's swim meet":     'Lila',
}

interface Tag { label: string; bg: string; color: string }

function getTag(event: FamilyEvent, members: Member[], isDemo?: boolean): Tag | null {
  const t = event.title.toLowerCase()
  if (t.includes('anniversary') || t.includes('date night')) {
    return { label: 'Us', bg: '#fbeaf0', color: '#993556' }
  }
  if (t.includes('family') || t.includes('sync') || t.includes('morning')) {
    return { label: 'Family', bg: '#f2f2f2', color: '#aaaaaa' }
  }
  let firstName: string | null = null
  if (event.member_id) {
    const member = members.find((m) => m.id === event.member_id)
    if (member) firstName = member.name.split(' ')[0]
  }
  if (!firstName && isDemo) firstName = DEMO_MEMBER_MAP[event.title] ?? null
  if (firstName) return { label: firstName, bg: '#eef4ff', color: '#5b80c4' }
  return null
}

function sortedEvents(events: FamilyEvent[]) {
  return [...events].sort((a, b) => {
    if (!a.time_start) return 1
    if (!b.time_start) return -1
    return a.time_start.localeCompare(b.time_start)
  })
}

// ── Full schedule list (desktop right column) ──────────────────────────────────

interface ScheduleCardProps {
  events: FamilyEvent[]
  members: Member[]
  isLoading?: boolean
  isDemo?: boolean
}

export function ScheduleCard({ events, members, isLoading, isDemo }: ScheduleCardProps) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 10, borderRadius: 3, background: '#efefef', flexShrink: 0 }} />
            <div style={{ flex: 1, height: 10, borderRadius: 3, background: '#efefef' }} />
            <div style={{ width: 32, height: 16, borderRadius: 3, background: '#efefef' }} />
          </div>
        ))}
      </div>
    )
  }

  const sorted = sortedEvents(events)
  if (sorted.length === 0) {
    return <p style={{ fontSize: 11, color: '#b4b2a9' }}>Nothing on the calendar today.</p>
  }

  const now    = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const activeIdx = sorted.findIndex(
    (e) => e.time_start && toMin(e.time_start) >= nowMin - 90,
  )

  return (
    <div>
      {sorted.map((event, idx) => {
        const past   = event.time_start ? toMin(event.time_start) < nowMin - 90 : false
        const active = idx === activeIdx
        const tag    = getTag(event, members, isDemo)

        return (
          <div
            key={event.id}
            style={{
              display:      'flex',
              alignItems:   'flex-start',
              gap:           10,
              padding:      '6px 0',
              borderBottom: '0.5px solid #f5f5f5',
              opacity:      past ? 0.35 : 1,
            }}
          >
            {/* Time */}
            <span style={{
              fontSize:   10,
              color:      active ? '#e8a44a' : '#bbbbbb',
              fontWeight:  active ? 500 : 400,
              width:       34,
              flexShrink:  0,
              paddingTop:  1,
              tabularNums: true,
            } as React.CSSProperties}>
              {fmtTime(event.time_start)}
            </span>
            {/* Title */}
            <span style={{ fontSize: 11, color: '#1a1a1a', flex: 1, lineHeight: 1.35 }}>
              {event.title}
            </span>
            {/* Tag */}
            {tag && (
              <span style={{
                fontSize:     9,
                background:   tag.bg,
                color:        tag.color,
                borderRadius:  3,
                padding:      '2px 6px',
                flexShrink:    0,
                whiteSpace:   'nowrap',
              }}>
                {tag.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Horizontal schedule strip (tablet / mobile) ────────────────────────────────

interface ScheduleStripProps {
  events: FamilyEvent[]
  members: Member[]
  isDemo?: boolean
  scrollable?: boolean  // true → mobile horizontal scroll, false → flex fill tablet
}

export function ScheduleStrip({ events, members, isDemo, scrollable }: ScheduleStripProps) {
  const sorted  = sortedEvents(events)
  const now     = new Date()
  const nowMin  = now.getHours() * 60 + now.getMinutes()
  const activeIdx = sorted.findIndex(
    (e) => e.time_start && toMin(e.time_start) >= nowMin - 90,
  )

  if (sorted.length === 0) return null

  return (
    <div style={{
      display:         'flex',
      gap:              6,
      overflowX:       scrollable ? 'auto' : 'visible',
      scrollbarWidth:  'none',
    }}>
      {sorted.map((event, idx) => {
        const active = idx === activeIdx
        const tag    = getTag(event, members, isDemo)
        const label  = tag?.label ?? ''
        const timeStr = fmtTime(event.time_start)
        // Shorten title for strip cards
        const shortTitle = event.title.replace(/^(School )?[Pp]ickup — /, 'Pickup — ')

        return (
          <div
            key={event.id}
            style={{
              background:   '#f7f7f7',
              borderRadius:  8,
              padding:      '8px 10px',
              flex:          scrollable ? '0 0 90px' : '1',
              minWidth:      scrollable ? 90 : 0,
            }}
          >
            <p style={{
              fontSize:   9,
              color:      active ? '#e8a44a' : '#bbbbbb',
              fontWeight:  active ? 500 : 400,
              marginBottom: 2,
            }}>
              {timeStr}
            </p>
            <p style={{
              fontSize:    10,
              fontWeight:   500,
              color:       '#1a1a1a',
              lineHeight:   1.3,
              overflow:    'hidden',
              display:     '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            } as React.CSSProperties}>
              {label ? `${shortTitle.split('—')[0].trim() || shortTitle}` : shortTitle}
            </p>
          </div>
        )
      })}
    </div>
  )
}
