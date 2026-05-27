import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { EventRow } from '../../components/ui/EventRow'
import { Card } from '../../components/ui/Card'
import { DEMO_EVENTS } from '../../lib/demo'
import type { FamilyEvent, Member } from '../../types'

const COLLAPSED_COUNT = 3

interface TodayScheduleProps {
  events: FamilyEvent[]
  members: Member[]
  isDemo?: boolean
}

// Map demo event titles → subline + daily flag
const DEMO_EVENT_MAP: Record<string, { subline: string; daily?: boolean }> = {}
DEMO_EVENTS.forEach((e) => {
  DEMO_EVENT_MAP[e.title] = { subline: e.subline, daily: e.daily }
})

const DEMO_MEMBER_MAP: Record<string, string> = {
  'School pickup — Lila': 'Lila',
  'Piano lesson': 'Lila',
  'Parent info night': 'Lila',
  "Lila's swim meet": 'Lila',
}

export function TodaySchedule({ events, members, isDemo }: TodayScheduleProps) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const sorted = [...events].sort((a: FamilyEvent, b: FamilyEvent) => {
    if (!a.time_start) return 1
    if (!b.time_start) return -1
    return a.time_start.localeCompare(b.time_start)
  })

  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT)
  const hiddenCount = sorted.length - COLLAPSED_COUNT

  function getMemberName(event: FamilyEvent): string | null {
    if (isDemo) return DEMO_MEMBER_MAP[event.title] || null
    if (!event.member_id) return null
    return members.find((m) => m.id === event.member_id)?.name?.split(' ')[0] || null
  }

  function isDaily(event: FamilyEvent): boolean {
    if (isDemo) return DEMO_EVENT_MAP[event.title]?.daily ?? false
    return event.title.toLowerCase().includes('sync') || event.title.toLowerCase().includes('morning')
  }

  function getSubline(event: FamilyEvent): string | null {
    if (isDemo) return DEMO_EVENT_MAP[event.title]?.subline || null
    return null
  }

  return (
    <section className="mb-8">
      <SectionHeader
        label="Today's Schedule"
        count={events.length}
        action={{ label: 'Open calendar', onClick: () => navigate('/calendar') }}
      />
      <Card padding="none">
        <div className="px-4">
          {sorted.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Nothing scheduled today</p>
          ) : (
            <>
              {visible.map((event) => (
                <EventRow
                  key={event.id}
                  timeStart={event.time_start}
                  title={event.title}
                  memberName={getMemberName(event)}
                  subline={getSubline(event)}
                  daily={isDaily(event)}
                />
              ))}
              {hiddenCount > 0 && !expanded && (
                <button
                  className="w-full text-xs text-slate-400 hover:text-slate-600 py-3 text-center"
                  onClick={() => setExpanded(true)}
                >
                  Show {hiddenCount} more ↓
                </button>
              )}
            </>
          )}
        </div>
      </Card>
    </section>
  )
}
