import { useCallback, useEffect, useState } from 'react'
import { format, isBefore, isToday, parseISO } from 'date-fns'
import { IconCar, IconMusic, IconHeart, IconCalendar, IconSchool, IconUsers } from '@tabler/icons-react'
import { KinlyBar } from '../../components/shared/KinlyBar'
import { ActionCard } from './ActionCard'
import { ScheduleCard, ScheduleStrip } from './ScheduleCard'
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
    "I need to complete Lila's soccer registration at seahawkssoccer.org before Friday — it needs a payment and a medical form. What's the quickest way to get this done?",
  'Confirm Saturday babysitter':
    "Draft a short, friendly text to Jess Nguyen confirming she's babysitting on Saturday evening for our anniversary dinner.",
  "Plan Noah's birthday":
    "Noah's 7th birthday is in 3 weeks. Suggest 3 venue ideas suitable for kids his age and draft a short, casual invite message.",
  'HVAC service appointment':
    "I need to book an HVAC seasonal service with PNW Comfort Systems. Write a brief call script for booking an appointment for next week.",
}
DEMO_TASKS.forEach((t) => { DEMO_SUBLINE_MAP[t.title] = t.subline })

// ── Chip helpers ───────────────────────────────────────────────────────────────

function chipIcon(title: string) {
  const t = title.toLowerCase()
  if (t.includes('pickup') || t.includes('drive'))  return <IconCar size={10} />
  if (t.includes('piano') || t.includes('lesson'))  return <IconMusic size={10} />
  if (t.includes('anniversary') || t.includes('date')) return <IconHeart size={10} />
  if (t.includes('school') || t.includes('homework')) return <IconSchool size={10} />
  if (t.includes('parent') || t.includes('family'))  return <IconUsers size={10} />
  return <IconCalendar size={10} />
}

function chipLabel(event: FamilyEvent): string {
  const t    = event.title.toLowerCase()
  const time = fmtTime(event.time_start)
  if (t.includes('pickup'))    return `pickup ${time}`
  if (t.includes('piano'))     return `piano ${time}`
  if (t.includes('anniversary')) return `anniversary`
  if (t.includes('sync'))      return `sync ${time}`
  if (t.includes('parent'))    return `parent ${time}`
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
    <p style={{
      fontSize: 9, fontWeight: 500, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: '#bbbbbb', marginBottom: 10,
    }}>
      {children}
    </p>
  )
}

// Divider label with trailing line (for "on the horizon")
function DividerLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      margin: '12px 0 8px',
    }}>
      <span style={{
        fontSize: 9, fontWeight: 500, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: '#cccccc', whiteSpace: 'nowrap',
      }}>
        {children}
      </span>
      <span style={{ flex: 1, height: '0.5px', background: '#efefef' }} />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div style={{ height: 68, borderRadius: 10, background: '#f5f5f3', marginBottom: 6 }} />
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
  const todayDayName = format(new Date(), 'EEEE')

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
        const evQ = isDemo
          ? supabase.from('events').select('*').eq('family_id', familyId)
          : supabase.from('events').select('*').eq('family_id', familyId).eq('date', today)
        const ocQ = isDemo
          ? supabase.from('occasions').select('*').eq('family_id', familyId).order('date').limit(3)
          : supabase.from('occasions').select('*').eq('family_id', familyId).gte('date', today).order('date').limit(3)
        const [evR, memR, ocR] = await Promise.all([evQ,
          supabase.from('members').select('*').eq('family_id', familyId), ocQ])
        setEvents((evR.data   as FamilyEvent[]) || [])
        setMembers((memR.data as Member[])      || [])
        setOccasions((ocR.data as Occasion[])   || [])
      } finally { setScheduleLoading(false) }
    })()
  }, [familyId, today]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (!familyId || !user || isDemo) return
    syncCalendarEvents(familyId, user.id, members).then(loadData).catch(() => {})
  }, [familyId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const pending = tasks.filter((t) => !t.done)
  const sortedTasks = [...pending].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  })
  const needsYouTasks = sortedTasks.filter((t) => {
    const p = taskPill(t)
    return p.variant === 'overdue' || p.variant === 'urgent'
  })
  const horizonTasks = sortedTasks.filter((t) => taskPill(t).variant === 'neutral')
  const taskCount    = pending.length
  const chips        = events.slice(0, 4)

  const [activeQuery, setActiveQuery] = useState<string | null>(null)

  function buildCard(task: Task) {
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
        agentAction={agentLine ? { label: agentLine, onClick: () => {
          const q = DEMO_ACTION_QUERY[task.title]
          if (q) setActiveQuery(q)
        }} : undefined}
      />
    )
  }

  return (
    <div style={{ background: '#F7F4EF', minHeight: 'calc(100vh - 52px)', paddingBottom: 64 }}>

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

      {/* KinlyPanel overlay */}
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

      {/* ── Greeting + chips ──────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px 0' }}>
        <h1 style={{
          fontFamily:    'Lora, serif',
          fontSize:       22,
          fontWeight:     400,
          color:         '#1a1a1a',
          letterSpacing: '-0.02em',
          lineHeight:     1.25,
        }}>
          {getGreeting()}.{' '}
          <em style={{ fontStyle: 'italic', color: '#9a8a76' }}>
            {getHeadline(taskCount)}
          </em>
        </h1>

        {/* Event chips */}
        {chips.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
            {chips.map((e) => (
              <span key={e.id} style={{
                display:     'inline-flex',
                alignItems:  'center',
                gap:          3,
                fontSize:     10,
                color:       '#b0a898',
                background:  '#f7f5f2',
                border:      '0.5px solid #edeae5',
                borderRadius: 20,
                padding:     '3px 7px',
              }}>
                {chipIcon(e.title)}
                {chipLabel(e)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div
        className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-5"
        style={{
          maxWidth: 1200,
          margin:   '0 auto',
          padding:  '16px 20px',
        }}
      >

        {/* ─── Left column: tasks ─────────────────────────────────────── */}
        <div>
          {/* NEEDS YOU */}
          <SectionLabel>needs you</SectionLabel>
          <div style={{ marginBottom: 4 }}>
            {tasksLoading ? (
              <><CardSkeleton /><CardSkeleton /><CardSkeleton /></>
            ) : needsYouTasks.length === 0 ? (
              <p style={{ fontSize: 11, color: '#b0b0b0' }}>Nothing urgent right now.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {needsYouTasks.map(buildCard)}
              </div>
            )}
          </div>

          {/* ON THE HORIZON */}
          {!tasksLoading && horizonTasks.length > 0 && (
            <div>
              <DividerLabel>on the horizon</DividerLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {horizonTasks.map(buildCard)}
              </div>
            </div>
          )}

          {/* Tablet + Mobile: schedule strip below tasks */}
          <div className="lg:hidden" style={{ marginTop: 20 }}>
            <SectionLabel>your {todayDayName.toLowerCase()}</SectionLabel>
            <ScheduleStrip
              events={events}
              members={members}
              isDemo={isDemo}
              scrollable={false}
            />

            {/* Mobile: scrollable override via inline class */}
            <style>{`
              @media (max-width: 639px) {
                .schedule-strip-wrap { overflow-x: auto; scrollbar-width: none; }
              }
              @media (min-width: 640px) {
                .schedule-strip-wrap { overflow-x: visible; }
              }
            `}</style>
          </div>
        </div>

        {/* ─── Right column: schedule + coming up (desktop only) ─────── */}
        <div className="hidden lg:block">
          <SectionLabel>your {todayDayName.toLowerCase()}</SectionLabel>
          <ScheduleCard
            events={events}
            members={members}
            isLoading={scheduleLoading}
            isDemo={isDemo}
          />

          {!scheduleLoading && occasions.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <SectionLabel>coming up</SectionLabel>
              {occasions.slice(0, 3).map((occ) => (
                <div key={occ.id} style={{
                  display:      'flex',
                  justifyContent: 'space-between',
                  alignItems:   'center',
                  padding:      '6px 0',
                  borderBottom: '0.5px solid #f5f5f5',
                }}>
                  <span style={{ fontSize: 11, color: '#1a1a1a' }}>{occ.label}</span>
                  <span style={{ fontSize: 10, color: '#bbbbbb', flexShrink: 0 }}>
                    {occasionDateLabel(occ.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
