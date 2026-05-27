import { useState } from 'react'
import { isBefore, isToday, parseISO } from 'date-fns'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { TaskRow } from '../../components/ui/TaskRow'
import { Card } from '../../components/ui/Card'
import { supabase } from '../../lib/supabase'
import { DEMO_TASKS } from '../../lib/demo'
import type { Task } from '../../types'

const COLLAPSED_COUNT = 3

interface NeedsAttentionProps {
  tasks: Task[]
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

export function NeedsAttention({ tasks, isDemo, onRefresh }: NeedsAttentionProps) {
  const [expanded, setExpanded] = useState(false)

  const pending = tasks.filter((t) => !t.done)
  const sorted = sortTasks(pending)
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT)
  const hiddenCount = sorted.length - COLLAPSED_COUNT

  async function toggleTask(task: Task) {
    await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id)
    onRefresh()
  }

  return (
    <section className="mb-8">
      <SectionHeader
        label="Needs Attention"
        count={pending.length}
        action={{ label: 'Snooze all', onClick: () => {} }}
      />
      <Card padding="none">
        <div className="px-4">
          {sorted.length === 0 ? (
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
  )
}
