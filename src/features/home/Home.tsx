import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { CommandBar } from './CommandBar'
import { NeedsAttention } from './NeedsAttention'
import { TodaySchedule } from './TodaySchedule'
import { FlaggedEmails } from './FlaggedEmails'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { syncCalendarEvents } from '../../lib/google'
import { buildDemoTasks, buildDemoEvents, toggleDemoTaskCompletion } from '../../lib/demoLocal'
import type { Task, FamilyEvent, Member } from '../../types'

export function Home() {
  const familyId = useAuthStore((s) => s.familyId)
  const user = useAuthStore((s) => s.user)
  const isDemo = useAuthStore((s) => s.isDemo)

  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<FamilyEvent[]>([])
  const [members, setMembers] = useState<Member[]>([])

  // Independent loading states — each section renders as soon as its data arrives
  const [tasksLoading, setTasksLoading] = useState(true)
  const [scheduleLoading, setScheduleLoading] = useState(true)

  const today = format(new Date(), 'yyyy-MM-dd')
  const todayLabel = format(new Date(), 'EEEE, MMMM d')

  const loadData = useCallback(() => {
    if (!familyId) return

    // ── Demo mode: use static constants, zero network calls ─────────────────
    if (isDemo) {
      setTasks(buildDemoTasks())
      setEvents(buildDemoEvents())
      setMembers([])
      setTasksLoading(false)
      setScheduleLoading(false)
      return
    }

    // ── Real mode: progressive Supabase queries ──────────────────────────────
    // Tasks fire alone → NeedsAttention renders as soon as this resolves
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

    // Events + Members fire together — both needed for TodaySchedule member names
    setScheduleLoading(true)
    void (async () => {
      try {
        const [eventsRes, membersRes] = await Promise.all([
          supabase.from('events').select('*').eq('family_id', familyId).eq('date', today),
          supabase.from('members').select('*').eq('family_id', familyId),
        ])
        setEvents((eventsRes.data as FamilyEvent[]) || [])
        setMembers((membersRes.data as Member[]) || [])
      } finally {
        setScheduleLoading(false)
      }
    })()
  }, [familyId, isDemo, today])

  useEffect(() => { loadData() }, [loadData])

  // Background calendar sync (real accounts only)
  useEffect(() => {
    if (!familyId || !user || isDemo) return
    syncCalendarEvents(familyId, user.id, members).then(loadData).catch(() => {})
  }, [familyId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Local-only task toggle for demo mode — persists to localStorage
  const handleDemoToggle = useCallback((taskId: string) => {
    const nowDone = toggleDemoTaskCompletion(taskId)
    setTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, done: nowDone } : t)
    )
  }, [])

  const pendingCount = tasks.filter((t) => !t.done).length
  const bothLoaded = !tasksLoading && !scheduleLoading

  return (
    <PageWrapper>
      {/* Page header — renders immediately */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#E8392A] tracking-tight">{todayLabel}</h1>
        {bothLoaded ? (
          <p className="text-sm text-slate-500 mt-1">
            {pendingCount > 0 && (
              <><strong className="text-slate-700 font-semibold">{pendingCount} items</strong> need your attention · </>
            )}
            <strong className="text-slate-700 font-semibold">{events.length} events</strong> on the calendar · 4 flagged emails
          </p>
        ) : (
          <div className="h-4 mt-1 w-64 rounded bg-slate-100 animate-pulse" />
        )}
      </div>

      {/* Command bar — always visible immediately */}
      <CommandBar familyId={familyId} onRefresh={loadData} />

      {/* Each section renders independently as its data arrives */}
      <NeedsAttention
        tasks={tasks}
        isLoading={tasksLoading}
        isDemo={isDemo}
        onRefresh={loadData}
        onDemoToggle={isDemo ? handleDemoToggle : undefined}
      />
      <TodaySchedule events={events} members={members} isLoading={scheduleLoading} isDemo={isDemo} />

      {/* FlaggedEmails uses static DEMO_EMAILS — no loading state needed */}
      <FlaggedEmails />
    </PageWrapper>
  )
}
