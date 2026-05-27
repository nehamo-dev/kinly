/**
 * demoLocal.ts — local-only demo mode, zero Supabase.
 *
 * Instead of signInAnonymously() + seeding real DB rows (which requires
 * Supabase to be awake), demo mode now stores a flag in localStorage and
 * synthesises Task[]/FamilyEvent[] from the static DEMO_* constants.
 * Navigation to "/" is instant; no network call is needed.
 */
import { format, subDays, addDays } from 'date-fns'
import { DEMO_TASKS, DEMO_EVENTS } from './demo'
import type { Task, FamilyEvent } from '../types'

// Sentinel family id used in all local demo objects
export const DEMO_FAMILY_ID = 'demo-local'

const STORAGE_KEY = 'kinly-demo'

// ── localStorage helpers ──────────────────────────────────────────────────────

interface StoredDemo { familyId: string }

export function getDemoState(): StoredDemo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredDemo) : null
  } catch { return null }
}

export function saveDemoState(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ familyId: DEMO_FAMILY_ID }))
  } catch {}
}

export function clearDemoState(): void {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

// ── Data builders — convert DEMO_* constants → typed domain objects ──────────

const TODAY = new Date()
const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

function urgencyToDueDate(urgency: 'Overdue' | 'Today' | 'This week'): string {
  switch (urgency) {
    case 'Overdue':    return fmt(subDays(TODAY, 3))
    case 'Today':      return fmt(TODAY)
    case 'This week':  return fmt(addDays(TODAY, 5))
  }
}

export function buildDemoTasks(): Task[] {
  return DEMO_TASKS.map((dt, i) => ({
    id: `demo-task-${i}`,
    family_id: DEMO_FAMILY_ID,
    event_id: null,
    title: dt.title,
    due_date: urgencyToDueDate(dt.urgency),
    tag: dt.tag,
    done: false,
    source: 'manual' as const,
  }))
}

export function buildDemoEvents(): FamilyEvent[] {
  const todayStr = fmt(TODAY)
  // TodaySchedule resolves member names from DEMO_MEMBER_MAP when isDemo,
  // so member_id doesn't need to point at a real row
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
