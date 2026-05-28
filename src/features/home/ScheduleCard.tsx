import type { FamilyEvent, Member } from '../../types'

interface ScheduleCardProps {
  events: FamilyEvent[]
  members: Member[]
  isLoading?: boolean
  isDemo?: boolean
}

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
  "Lila's swim meet":     'Lila',
}

interface Chip { label: string; bg: string; color: string }

function getChip(event: FamilyEvent, members: Member[], isDemo?: boolean): Chip | null {
  const t = event.title.toLowerCase()

  // Couple events
  if (t.includes('anniversary') || t.includes('date night')) {
    return { label: 'Us', bg: '#FBEAF0', color: '#993556' }
  }

  // Family / shared events (no specific member)
  if (t.includes('family') || t.includes('sync') || t.includes('morning')) {
    return { label: 'Family', bg: '#EDE9E2', color: '#5F5E5A' }
  }

  // Try member lookup
  let firstName: string | null = null
  if (event.member_id) {
    const member = members.find((m) => m.id === event.member_id)
    if (member) firstName = member.name.split(' ')[0]
  }
  // Demo fallback
  if (!firstName && isDemo) firstName = DEMO_MEMBER_MAP[event.title] ?? null

  if (firstName) return { label: firstName, bg: '#EEEDFE', color: '#534AB7' }

  return null
}

export function ScheduleCard({ events, members, isLoading, isDemo }: ScheduleCardProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2.5 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-[38px] h-3 rounded flex-shrink-0" style={{ background: '#EFEFEF' }} />
            <div className="flex-1 h-3 rounded" style={{ background: '#EFEFEF' }} />
            <div className="w-10 h-4 rounded-full" style={{ background: '#EFEFEF' }} />
          </div>
        ))}
      </div>
    )
  }

  const sorted = [...events].sort((a, b) => {
    if (!a.time_start) return 1
    if (!b.time_start) return -1
    return a.time_start.localeCompare(b.time_start)
  })

  if (sorted.length === 0) {
    return (
      <p className="text-[12px]" style={{ color: '#B4B2A9' }}>
        Nothing on the calendar today.
      </p>
    )
  }

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  // Active = first event that started within the last 90 min or is still upcoming
  const activeIdx = sorted.findIndex(
    (e) => e.time_start && toMin(e.time_start) >= nowMin - 90,
  )

  return (
    <div className="flex flex-col">
      {sorted.map((event, idx) => {
        const past = event.time_start ? toMin(event.time_start) < nowMin - 90 : false
        const active = idx === activeIdx
        const chip = getChip(event, members, isDemo)

        return (
          <div
            key={event.id}
            className="flex items-center gap-2.5 py-[7px]"
            style={{
              opacity: past ? 0.35 : 1,
              borderLeft: active
                ? '2px solid #EF9F27'
                : '2px solid transparent',
              paddingLeft: '10px',
              marginLeft: '-2px',
            }}
          >
            {/* Time */}
            <span
              className="text-[11px] w-[38px] flex-shrink-0 tabular-nums"
              style={{ color: active ? '#EF9F27' : '#B4B2A9' }}
            >
              {fmtTime(event.time_start)}
            </span>

            {/* Title */}
            <span
              className="text-[12px] flex-1 leading-snug min-w-0 truncate"
              style={{ color: '#1A1A18' }}
            >
              {event.title}
            </span>

            {/* Member chip */}
            {chip && (
              <span
                className="text-[10px] font-medium rounded-full px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap"
                style={{ background: chip.bg, color: chip.color }}
              >
                {chip.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
