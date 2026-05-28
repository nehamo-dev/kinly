import { useState } from 'react'
import { addDays, format, isBefore, isToday, parseISO } from 'date-fns'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { TaskRow } from '../../components/ui/TaskRow'
import { Card } from '../../components/ui/Card'
import { EditTaskModal } from './EditTaskModal'
import { supabase } from '../../lib/supabase'
import { DEMO_TASKS } from '../../lib/demo'
import type { Task } from '../../types'

const COLLAPSED_COUNT = 3
const SKELETON_COUNT = 3

interface NeedsAttentionProps {
  tasks: Task[]
  isLoading?: boolean
  isDemo?: boolean
  onRefresh: () => void
}

function urgencyFor(task: Task): { label: string; color: 'red' | 'green' | 'slate' } {
  if (!task.due_date) return { label: '', color: 'slate' }
  const due = parseISO(task.due_date)
  if (isBefore(due, new Date()) && !isToday(due)) return { label: 'Overdue', color: 'red' }
  if (isToday(due)) return { label: 'Today', color: 'green' }
  return { label: 'This week', color: 'slate' }
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const order = (t: Task) => {
      if (!t.due_date) return 3
      const d = parseISO(t.due_date)
      if (isBefore(d, new Date()) && !isToday(d)) return 0
      if (isToday(d)) return 1
      return 2
    }
    return order(a) - order(b)
  })
}

// Map demo task titles → member names
const DEMO_MEMBER_MAP: Record<string, string> = {
  'Complete soccer registration': 'Lila',
  "Plan Noah's birthday": 'Noah',
}

// Map demo task titles → rich sublines
const DEMO_SUBLINE_MAP: Record<string, string> = {}
DEMO_TASKS.forEach((t) => { DEMO_SUBLINE_MAP[t.title] = t.subline })

function TaskSkeleton() {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-slate-100 last:border-0 animate-pulse">
      {/* Ring placeholder */}
      <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-slate-200 flex-shrink-0" />
      {/* Text lines */}
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-3.5 bg-slate-100 rounded w-2/5" />
          <div className="h-4 bg-slate-100 rounded-full w-10" />
        </div>
        <div className="h-3 bg-slate-100 rounded w-4/5" />
      </div>
      {/* Urgency placeholder */}
      <div className="h-3 bg-slate-100 rounded w-12 mt-0.5 flex-shrink-0" />
    </div>
  )
}

export function NeedsAttention({ tasks, isLoading, isDemo, onRefresh }: NeedsAttentionProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const pending = tasks.filter((t) => !t.done)
  const sorted = sortTasks(pending)
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT)
  const hiddenCount = sorted.length - COLLAPSED_COUNT

  async function toggleTask(task: Task) {
    await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id)
    onRefresh()
  }

  async function snoozeTask(task: Task, when: 'tomorrow' | 'next-week') {
    const days = when === 'tomorrow' ? 1 : 7
    const newDate = format(addDays(new Date(), days), 'yyyy-MM-dd')
    await supabase.from('tasks').update({ due_date: newDate }).eq('id', task.id)
    onRefresh()
  }

  return (
    <>
    <EditTaskModal
      task={editingTask}
      onClose={() => setEditingTask(null)}
      onSaved={() => { setEditingTask(null); onRefresh() }}
    />
    <section className="mb-8">
      <SectionHeader
        label="Needs Attention"
        count={isLoading ? undefined : pending.length}
      />
      <Card padding="none">
        <div className="px-4">
          {isLoading ? (
            Array.from({ length: SKELETON_COUNT }).map((_, i) => <TaskSkeleton key={i} />)
          ) : sorted.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">All caught up ✓</p>
          ) : (
            <>
              {visible.map((task) => {
                const { label, color } = urgencyFor(task)
                const subline = isDemo ? DEMO_SUBLINE_MAP[task.title] : undefined
                const memberName = isDemo ? DEMO_MEMBER_MAP[task.title] : undefined
                return (
                  <TaskRow
                    key={task.id}
                    title={task.title}
                    tag={task.tag}
                    memberName={memberName}
                    subline={subline}
                    urgency={label}
                    urgencyColor={color}
                    done={task.done}
                    onToggle={() => toggleTask(task)}
                    onSnooze={(when) => snoozeTask(task, when)}
                    onEdit={() => setEditingTask(task)}
                  />
                )
              })}

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
    </>
  )
}
