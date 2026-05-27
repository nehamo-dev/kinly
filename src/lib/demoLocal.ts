/**
 * demoLocal.ts — local-only demo mode, zero Supabase.
 *
 * Demo mode stores its state in two localStorage keys:
 *   kinly-demo          → { familyId } — marks the session as demo
 *   kinly-demo-done     → string[]     — completed task IDs (persists across refresh)
 */
import { format, subDays, addDays } from 'date-fns'
import { DEMO_TASKS, DEMO_EVENTS } from './demo'
import type { Task, FamilyEvent } from '../types'

export const DEMO_FAMILY_ID = 'demo-local'

const DEMO_KEY      = 'kinly-demo'
const COMPLETED_KEY = 'kinly-demo-done'

// ── Demo session ──────────────────────────────────────────────────────────────

interface StoredDemo { familyId: string }

export function getDemoState(): StoredDemo | null {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    return raw ? (JSON.parse(raw) as StoredDemo) : null
  } catch { return null }
}

export function saveDemoState(): void {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify({ familyId: DEMO_FAMILY_ID }))
  } catch {}
}

export function clearDemoState(): void {
  try {
    localStorage.removeItem(DEMO_KEY)
    localStorage.removeItem(COMPLETED_KEY)
  } catch {}
}

// ── Task completion persistence ───────────────────────────────────────────────

function getCompletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(COMPLETED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

/** Toggles a task's completion in localStorage. Returns the new done state. */
export function toggleDemoTaskCompletion(taskId: string): boolean {
  const ids = getCompletedIds()
  const nowDone = !ids.has(taskId)
  if (nowDone) { ids.add(taskId) } else { ids.delete(taskId) }
  try { localStorage.setItem(COMPLETED_KEY, JSON.stringify([...ids])) } catch {}
  return nowDone
}

// ── Data builders ─────────────────────────────────────────────────────────────

const TODAY = new Date()
const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

function urgencyToDueDate(urgency: 'Overdue' | 'Today' | 'This week'): string {
  switch (urgency) {
    case 'Overdue':   return fmt(subDays(TODAY, 3))
    case 'Today':     return fmt(TODAY)
    case 'This week': return fmt(addDays(TODAY, 5))
  }
}

/** Builds Task[] from constants, applying any saved completion state. */
export function buildDemoTasks(): Task[] {
  const completed = getCompletedIds()
  return DEMO_TASKS.map((dt, i) => {
    const id = `demo-task-${i}`
    return {
      id,
      family_id: DEMO_FAMILY_ID,
      event_id: null,
      title: dt.title,
      due_date: urgencyToDueDate(dt.urgency),
      tag: dt.tag,
      done: completed.has(id),
      source: 'manual' as const,
    }
  })
}

export function buildDemoEvents(): FamilyEvent[] {
  const todayStr = fmt(TODAY)
  return DEMO_EVENTS.map((de, i) => ({
    id: `demo-event-${i}`,
    family_id: DEMO_FAMILY_ID,
    member_id: null,
    service_id: null,
    title: de.title,
    date: todayStr,
    time_start: de.timeStart,
    source: 'manual' as const,
    calendar_event_id: null,
    gmail_message_id: null,
  }))
}
