import { useCallback, useEffect, useState } from 'react'
import { format, isBefore, isToday, parseISO } from 'date-fns'
import { IconCar, IconMusic, IconHeart, IconCalendar } from '@tabler/icons-react'
import { KinlyBar } from '../../components/shared/KinlyBar'
import { ActionCard } from './ActionCard'
import { ScheduleCard } from './ScheduleCard'
import { KinlyPanel } from './KinlyPanel'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { syncCalendarEvents } from '../../lib/google'
import { DEMO_TASKS } from '../../lib/demo'
import type { Task, FamilyEvent, Member, Occasion } from '../../types'
import type { PillVariant } from './ActionCard'

// ── Helpers ────────────────────────────────────────────────────────────────────

function taskPill(task: Task): { label: string; variant: PillVariant } {
  if (!task.due_date) return { label: 'no date', variant: 'neutral' }
  const due = parseISO(task.due_date)
  if (isBefore(due, new Date()) && !isToday(due)) return { label: 'Overdue', variant: 'overdue' }
  if (isToday(due)) return { label: 'Today', variant: 'urgent' }
  const daysOut = Math.ceil((due.getTime() - Date.now()) / 86_400_000)
  if (daysOut <= 3) return { label: `${daysOut}d`, variant: 'urgent' }
  return { label: format(due, 'MMM d'), variant: 'neutral' }
}

function occasionDateLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000)
  if (days <= 7)  return `${format(d, 'MMM d')} · in ${days}d`
  if (days <= 21) return `${format(d, 'MMM d')} · in ${Math.round(days / 7)}w`
  return `${format(d, 'MMM d')} · in ${days}d`
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getHeadline(count: number): string {
  if (count === 0) return "you're all caught up."
  if (count === 1) return 'one thing needs you.'
  return `${count} things need you.`
}

// ── Demo enrichment ────────────────────────────────────────────────────────────

const DEMO_SUBLINE_MAP: Record<string, string> = {}
const DEMO_AGENT_MAP: Record<string, string> = {
  'House cleaning overdue by 3 days': 'Kinly can reschedule Maria',
  'Complete soccer registration':     'Kinly can pre-fill the form',
  'Confirm Saturday babysitter':      'Kinly can text Jess',
  "Plan Noah's birthday":             'Kinly can suggest venues + invites',
  'HVAC service appointment':         'Kinly can find 3 open slots',
}
const DEMO_ACTION_QUERY: Record<string, string> = {
  'House cleaning overdue by 3 days':
    "Maria's Cleaning Co. is 3 days overdue on a biweekly schedule. Draft a short, friendly text to reschedule for the next available slot this week.",
  'Complete soccer registration':
    "I need to complete Lila's soccer registration at seahawkssoccer.org before Friday — it needs a payment and a medical form. What's the quickest way to get this done, and what info will I need?",
  'Confirm Saturday babysitter':
    "Draft a short, friendly text to Jess Nguyen confirming she's babysitting on Saturday evening for our anniversary dinner.",
  "Plan Noah's birthday":
    "Noah's 7th birthday is in 3 weeks. Suggest 3 venue ideas suitable for kids his age and draft a short, casual invite message I can send to parents.",
  'HVAC service appointment':
    "I need to book an HVAC seasonal service with PNW Comfort Systems. Write a brief call script for booking an appointment for next week.",
}
DEMO_TASKS.forEach((t) => { DEMO_SUBLINE_MAP[t.title] = t.subline })

// ── Chip helpers ───────────────────────────────────────────────────────────────

function chipIcon(title: string) {
  const t = title.toLowerCase()
  if (t.includes('pickup') || t.includes('drive') || t.includes('car')) return <IconCar size={11} />
  if (t.includes('piano') || t.includes('music') || t.includes('lesson')) return <IconMusic size={11} />
  if (t.includes('anniversary') || t.includes('date') || t.includes('dinner')) return <IconHeart size={11} />
  return <IconCalendar size={11} />
}

function chipLabel(event: FamilyEvent): string {
  const t = event.title.toLowerCase()
  const time = fmtTime(event.time_start)
  if (t.includes('pickup')) return `pickup ${time}`
  if (t.includes('piano')) return `piano ${time}`
  if (t.includes('anniversary')) return `anniversary`
  if (t.includes('sync')) return `sync ${time}`
  return `${event.title.split(' ')[0].toLowerCase()} ${time}`
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        color: '#B4B2A9',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontWeight: 500,
        marginBottom: 10,
      }}
    >
      {children}
    </p>
  )
}

// ── Skeleton card ──────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div
      style={{
        height: 78,
        borderRadius: 12,
        background: '#EFEFED',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function Home() {
  const familyId = useAuthStore((s) => s.familyId)
  const user     = useAuthStore((s) => s.user)
  const isDemo   = useAuthStore((s) => s.isDemo)

  const [tasks,     setTasks]     = useState<Task[]>([])
  const [events,    setEvents]    = useState<FamilyEvent[]>([])
  const [members,   setMembers]   = useState<Member[]>([])
  const [occasions, setOccasions] = useState<Occasion[]>([])

  const [tasksLoading,    setTasksLoading]    = useState(true)
  const [scheduleLoading, setScheduleLoading] = useState(true)

  const today        = format(new Date(), 'yyyy-MM-dd')
  const todayDayName = format(new Date(), 'EEEE') // "Wednesday"

  const loadData = useCallback(() => {
    if (!familyId) return

    setTasksLoading(true)
    void (async () => {
      try {
        const { data } = await supabase
          .from('tasks').select('*').eq('family_id', familyId).eq('done', false)
        setTasks((data as Task[]) || [])
      } finally { setTasksLoading(false) }
    })()

    setScheduleLoading(true)
    void (async () => {
      try {
        const eventsQuery = isDemo
          ? supabase.from('events').select('*').eq('family_id', familyId)
          : supabase.from('events').select('*').eq('family_id', familyId).eq('date', today)

        const occasionsQuery = isDemo
          ? supabase.from('occasions').select('*').eq('family_id', familyId).order('date').limit(3)
          : supabase.from('occasions').select('*').eq('family_id', familyId).gte('date', today).order('date').limit(3)

        const [eventsRes, membersRes, occasionsRes] = await Promise.all([
          eventsQuery,
          supabase.from('members').select('*').eq('family_id', familyId),
          occasionsQuery,
        ])
        setEvents((eventsRes.data   as FamilyEvent[]) || [])
        setMembers((membersRes.data as Member[])      || [])
        setOccasions((occasionsRes.data as Occasion[]) || [])
      } finally { setScheduleLoading(false) }
    })()
  }, [familyId, today]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!familyId || !user || isDemo) return
    syncCalendarEvents(familyId, user.id, members).then(loadData).catch(() => {})
  }, [familyId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const pending = tasks.filter((t) => !t.done)

  // Sort: overdue first, then today, then upcoming, nulls last
  const sortedTasks = [...pending].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  })

  // Split into sections
  const needsYouTasks = sortedTasks.filter((t) => {
    const p = taskPill(t)
    return p.variant === 'overdue' || p.variant === 'urgent'
  })
  const horizonTasks = sortedTasks.filter((t) => taskPill(t).variant === 'neutral')

  const taskCount  = pending.length
  const [activeQuery, setActiveQuery] = useState<string | null>(null)

  // Chips (up to 4 events from today)
  const chips = events.slice(0, 4)

  return (
    <div style={{ background: '#F7F4EF', minHeight: 'calc(100vh - 52px)' }}>

      {/* KinlyBar */}
      <KinlyBar
        page="today"
        context={{
          memberNames:      members.map((m) => m.name.split(' ')[0]),
          todayEvents:      events.map((e) => ({ title: e.title, time: e.time_start })),
          pendingTaskCount: taskCount,
        }}
        members={members}
        onActionExecuted={() => loadData()}
      />

      {/* KinlyPanel (AI response overlay) */}
      {activeQuery && (
        <KinlyPanel
          query={activeQuery}
          context={{
            memberNames:      members.map((m) => m.name.split(' ')[0]),
            todayEvents:      events.map((e) => ({ title: e.title, time: e.time_start })),
            pendingTaskCount: taskCount,
          }}
          onClose={() => setActiveQuery(null)}
        />
      )}

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          minHeight: 'calc(100vh - 120px)',
        }}
      >

        {/* ── Left column — greeting + tasks ──────────────────────────── */}
        <div
          style={{
            padding: '28px 32px',
            borderRight: '0.5px solid #E8E4DC',
          }}
        >
          {/* Greeting heading */}
          <h1
            style={{
              fontSize: 26,
              fontWeight: 500,
              color: '#1A1A18',
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
              margin: '0 0 14px',
            }}
          >
            {getGreeting()}.{' '}
            <em style={{ fontStyle: 'italic', color: '#EF9F27' }}>
              {getHeadline(taskCount)}
            </em>
          </h1>

          {/* Event chips */}
          {chips.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                marginBottom: 28,
              }}
            >
              {chips.map((e) => (
                <span
                  key={e.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#5F5E5A',
                    background: '#F3F0EA',
                    borderRadius: 20,
                    padding: '4px 10px',
                    flexShrink: 0,
                  }}
                >
                  {chipIcon(e.title)}
                  {chipLabel(e)}
                </span>
              ))}
            </div>
          )}

          {/* NEEDS YOU section */}
          {(tasksLoading || needsYouTasks.length > 0) && (
            <section style={{ marginBottom: 28 }}>
              <SectionLabel>Needs you</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasksLoading ? (
                  <><CardSkeleton /><CardSkeleton /><CardSkeleton /></>
                ) : needsYouTasks.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#B4B2A9' }}>Nothing urgent right now.</p>
                ) : (
                  needsYouTasks.map((task) => {
                    const agentLine = isDemo ? DEMO_AGENT_MAP[task.title] : undefined
                    const subtitle  = isDemo
                      ? (DEMO_SUBLINE_MAP[task.title] ?? '')
                      : task.due_date ? `Due ${format(parseISO(task.due_date), 'MMM d')}` : ''

                    return (
                      <ActionCard
                        key={task.id}
                        title={task.title}
                        subtitle={subtitle}
                        timePill={taskPill(task)}
                        agentLine={agentLine}
                        agentAction={
                          agentLine
                            ? {
                                label: agentLine,
                                onClick: () => {
                                  const q = DEMO_ACTION_QUERY[task.title]
                                  if (q) setActiveQuery(q)
                                },
                              }
                            : undefined
                        }
                      />
                    )
                  })
                )}
              </div>
            </section>
          )}

          {/* ON THE HORIZON section */}
          {!tasksLoading && horizonTasks.length > 0 && (
            <section>
              <SectionLabel>On the horizon</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {horizonTasks.map((task) => {
                  const agentLine = isDemo ? DEMO_AGENT_MAP[task.title] : undefined
                  const subtitle  = isDemo
                    ? (DEMO_SUBLINE_MAP[task.title] ?? '')
                    : task.due_date ? `Due ${format(parseISO(task.due_date), 'MMM d')}` : ''

                  return (
                    <ActionCard
                      key={task.id}
                      title={task.title}
                      subtitle={subtitle}
                      timePill={taskPill(task)}
                      agentLine={agentLine}
                      agentAction={
                        agentLine
                          ? {
                              label: agentLine,
                              onClick: () => {
                                const q = DEMO_ACTION_QUERY[task.title]
                                if (q) setActiveQuery(q)
                              },
                            }
                          : undefined
                      }
                    />
                  )
                })}
              </div>
            </section>
          )}

          {/* All-clear state */}
          {!tasksLoading && sortedTasks.length === 0 && (
            <p style={{ fontSize: 13, color: '#B4B2A9' }}>Nothing needs you right now.</p>
          )}
        </div>

        {/* ── Right column — schedule + coming up ─────────────────────── */}
        <div style={{ padding: '28px 24px', background: '#FDFCF9' }}>

          {/* YOUR [DAY] */}
          <SectionLabel>Your {todayDayName}</SectionLabel>
          <ScheduleCard
            events={events}
            members={members}
            isLoading={scheduleLoading}
            isDemo={isDemo}
          />

          {/* COMING UP */}
          {!scheduleLoading && occasions.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <SectionLabel>Coming up</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {occasions.slice(0, 3).map((occ) => (
                  <div
                    key={occ.id}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 8,
                      padding: '7px 0',
                      borderBottom: '0.5px solid #F3F0EA',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1A1A18', flex: 1, lineHeight: 1.35 }}>
                      {occ.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#B4B2A9', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {occasionDateLabel(occ.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
