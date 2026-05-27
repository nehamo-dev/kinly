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
import type { Task, FamilyEvent, Member } from '../../types'

export function Home() {
  const familyId = useAuthStore((s) => s.familyId)
  const user = useAuthStore((s) => s.user)
  const isDemo = useAuthStore((s) => s.isDemo)
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<FamilyEvent[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const today = format(new Date(), 'yyyy-MM-dd')
  const todayLabel = format(new Date(), 'EEEE, MMMM d')

  const loadData = useCallback(async () => {
    if (!familyId) return
    setLoading(true)
    try {
      const [tasksRes, eventsRes, membersRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('family_id', familyId).eq('done', false),
        supabase.from('events').select('*').eq('family_id', familyId).eq('date', today),
        supabase.from('members').select('*').eq('family_id', familyId),
      ])
      setTasks((tasksRes.data as Task[]) || [])
      setEvents((eventsRes.data as FamilyEvent[]) || [])
      setMembers((membersRes.data as Member[]) || [])
    } finally {
      setLoading(false)
    }
  }, [familyId, today])

  useEffect(() => { loadData() }, [loadData])

  // Background calendar sync
  useEffect(() => {
    if (!familyId || !user || isDemo) return
    syncCalendarEvents(familyId, user.id, members).then(loadData).catch(() => {})
  }, [familyId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const pendingCount = tasks.filter((t) => !t.done).length
  const flaggedCount = 4 // demo emails

  return (
    <PageWrapper>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{todayLabel}</h1>
        {!loading && (
          <p className="text-sm text-slate-500 mt-1">
            {pendingCount > 0 && (
              <><strong className="text-slate-700 font-semibold">{pendingCount} items</strong> need your attention · </>
            )}
            <strong className="text-slate-700 font-semibold">{events.length} events</strong> on the calendar · {flaggedCount} flagged emails
          </p>
        )}
      </div>

      {/* AI command bar */}
      <CommandBar familyId={familyId} onRefresh={loadData} />

      {/* Sections */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-1/4 mb-4" />
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-10 bg-slate-50 rounded mb-2" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <>
          <NeedsAttention tasks={tasks} isDemo={isDemo} onRefresh={loadData} />
          <TodaySchedule events={events} members={members} isDemo={isDemo} />
          <FlaggedEmails />
        </>
      )}
    </PageWrapper>
  )
}
