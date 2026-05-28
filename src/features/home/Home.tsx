import { useCallback, useEffect, useState } from 'react'
import { format, isBefore, isToday, parseISO } from 'date-fns'
import { HeroHeader } from './HeroHeader'
import { ActionCard } from './ActionCard'
import { ScheduleCard } from './ScheduleCard'
import { ComingUpCard } from './ComingUpCard'
import { KinlyPanel } from './KinlyPanel'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { syncCalendarEvents } from '../../lib/google'
import { DEMO_TASKS } from '../../lib/demo'
import type { Task, FamilyEvent, Member, Occasion } from '../../types'
import type { CardMember, PillVariant } from './ActionCard'

// ── Helpers ────────────────────────────────────────────────────────────────────

function tagToMember(tag: Task['tag']): CardMember {
  switch (tag) {
    case 'kid':      return 'kid'
    case 'home':     return 'home'
    case 'occasion': return 'couple'
    case 'urgent':   return 'urgent'
    default:         return 'shared'
  }
}

function taskPill(task: Task): { label: string; variant: PillVariant } {
  if (!task.due_date) return { label: 'no date', variant: 'neutral' }
  const due = parseISO(task.due_date)
  if (isBefore(due, new Date()) && !isToday(due)) return { label: 'overdue', variant: 'overdue' }
  if (isToday(due)) return { label: 'today', variant: 'urgent' }
  const daysOut = Math.ceil((due.getTime() - Date.now()) / 86_400_000)
  if (daysOut <= 3) return { label: `${daysOut}d`, variant: 'urgent' }
  return { label: format(due, 'MMM d'), variant: 'neutral' }
}

function sectionHeadline(count: number): string {
  if (count === 0) return 'all caught up'
  if (count === 1) return 'one thing for you'
  if (count === 2) return 'a couple things for you'
  if (count === 3) return 'a few things for you'
  return `${count} things need you`
}

function occasionDateLabel(dateStr: string): string {
  const d = parseISO(dateStr)
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000)
  if (days <= 7)  return `${format(d, 'EEEE')} · ${format(d, 'MMM d')}`
  if (days <= 21) return `${format(d, 'MMM d')} · in ${Math.round(days / 7)}w`
  return `${format(d, 'MMM d')} · in ${days}d`
}

// ── Demo-mode enrichment maps ──────────────────────────────────────────────────

const DEMO_SUBLINE_MAP: Record<string, string> = {}
const DEMO_AGENT_MAP: Record<string, string> = {
  'House cleaning overdue by 3 days': 'Kinly can reschedule Maria',
  'Complete soccer registration':     'Kinly can pre-fill the form',
  'Confirm Saturday babysitter':      'Kinly can text Jess to confirm',
  "Plan Noah's birthday":             'Kinly can suggest venues + draft invites',
  'HVAC service appointment':         'Kinly can find 3 open slots',
}
DEMO_TASKS.forEach((t) => { DEMO_SUBLINE_MAP[t.title] = t.subline })

// ── Component ──────────────────────────────────────────────────────────────────

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
  const todayDayName = format(new Date(), 'EEEE').toLowerCase() // "wednesday"

  const loadData = useCallback(() => {
    if (!familyId) return

    // Tasks — fire alone so left col renders first
    setTasksLoading(true)
    void (async () => {
      try {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .eq('family_id', familyId)
          .eq('done', false)
        setTasks((data as Task[]) || [])
      } finally {
        setTasksLoading(false)
      }
    })()

    // Events + members + upcoming occasions — fire together for right col
    setScheduleLoading(true)
    void (async () => {
      try {
        const [eventsRes, membersRes, occasionsRes] = await Promise.all([
          supabase
            .from('events')
            .select('*')
            .eq('family_id', familyId)
            .eq('date', today),
          supabase
            .from('members')
            .select('*')
            .eq('family_id', familyId),
          supabase
            .from('occasions')
            .select('*')
            .eq('family_id', familyId)
            .gte('date', today)
            .order('date', { ascending: true })
            .limit(3),
        ])
        setEvents((eventsRes.data     as FamilyEvent[]) || [])
        setMembers((membersRes.data   as Member[])      || [])
        setOccasions((occasionsRes.data as Occasion[])  || [])
      } finally {
        setScheduleLoading(false)
      }
    })()
  }, [familyId, today])

  useEffect(() => { loadData() }, [loadData])

  // Background calendar sync (real accounts only)
  useEffect(() => {
    if (!familyId || !user || isDemo) return
    syncCalendarEvents(familyId, user.id, members).then(loadData).catch(() => {})
  }, [familyId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const pending   = tasks.filter((t) => !t.done)
  const taskCount = pending.length

  const [activeQuery, setActiveQuery] = useState<string | null>(null)

  return (
    <div className="min-h-screen" style={{ background: '#F7F4EF' }}>

      {/* ── Full-width dark hero ─────────────────────────────────────────── */}
      <HeroHeader
        events={events}
        members={members}
        taskCount={taskCount}
        onQuery={(q) => setActiveQuery(q)}
      />

      {/* ── Kinly AI panel (shows when query is active) ──────────────────── */}
      {activeQuery && (
        <KinlyPanel
          query={activeQuery}
          context={{
            memberNames: members.map((m) => m.name.split(' ')[0]),
            todayEvents: events.map((e) => ({ title: e.title, time: e.time_start })),
            pendingTaskCount: taskCount,
          }}
          onClose={() => setActiveQuery(null)}
        />
      )}

      {/* ── Two-column body ──────────────────────────────────────────────── */}
      <div
        className="max-w-[1200px] mx-auto flex"
        style={{ minHeight: 'calc(100vh - 180px)' }}
      >

        {/* Left col — 55% — tasks / actions */}
        <div
          style={{
            width: '55%',
            background: '#F7F4EF',
            padding: '20px 24px',
            borderRight: '0.5px solid #E8E4DC',
          }}
        >
          <p
            className="text-[11px] uppercase tracking-widest mb-3"
            style={{ color: '#B4B2A9' }}
          >
            {tasksLoading ? ' ' : sectionHeadline(taskCount)}
          </p>

          <div className="flex flex-col gap-2">
            {tasksLoading ? (
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-[12px] animate-pulse"
                  style={{ height: 72, background: '#EFEFEF' }}
                />
              ))
            ) : pending.length === 0 ? (
              <p className="text-[13px]" style={{ color: '#B4B2A9' }}>
                Nothing needs you right now.
              </p>
            ) : (
              pending.map((task) => {
                const agentLine   = isDemo ? DEMO_AGENT_MAP[task.title] : undefined
                const agentAction = agentLine
                  ? { label: 'Let Kinly handle it', onClick: () => {} }
                  : undefined
                const subtitle = isDemo
                  ? (DEMO_SUBLINE_MAP[task.title] ?? '')
                  : task.due_date
                    ? `Due ${format(parseISO(task.due_date), 'MMM d')}`
                    : ''

                return (
                  <ActionCard
                    key={task.id}
                    title={task.title}
                    subtitle={subtitle}
                    member={tagToMember(task.tag)}
                    timePill={taskPill(task)}
                    agentLine={agentLine}
                    agentAction={agentAction}
                  />
                )
              })
            )}
          </div>
        </div>

        {/* Right col — 45% — schedule + coming up */}
        <div
          style={{
            width: '45%',
            background: '#FDFCF9',
            padding: '20px 24px',
          }}
        >
          {/* Today's schedule */}
          <p
            className="text-[11px] uppercase tracking-widest mb-3"
            style={{ color: '#B4B2A9' }}
          >
            your {todayDayName}
          </p>
          <ScheduleCard
            events={events}
            members={members}
            isLoading={scheduleLoading}
            isDemo={isDemo}
          />

          {/* Coming up — only when occasions are loaded and available */}
          {!scheduleLoading && occasions.length > 0 && (
            <div className="mt-6">
              <p
                className="text-[11px] uppercase tracking-widest mb-3"
                style={{ color: '#B4B2A9' }}
              >
                coming up
              </p>
              <div className="flex flex-col gap-2">
                {occasions.slice(0, 2).map((occ) => (
                  <ComingUpCard
                    key={occ.id}
                    label={occ.label}
                    dateLabel={occasionDateLabel(occ.date)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
