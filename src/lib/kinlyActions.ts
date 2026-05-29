// ─── Kinly action layer ───────────────────────────────────────────────────────
// Groq appends a structured [ACTION:{...}] block to its response when it
// detects an intent (add event, add task, add member). We strip the tag from
// displayed text, parse it, and execute the corresponding Supabase write.

import { format } from 'date-fns'
import { supabase } from './supabase'
import type { Member } from '../types'

// ── Action types ──────────────────────────────────────────────────────────────

export interface AddEventAction {
  type: 'add_event'
  title: string
  date: string          // YYYY-MM-DD
  time_start?: string   // HH:MM (24h)
  member_name?: string  // first name — matched to members list
}

export interface AddTaskAction {
  type: 'add_task'
  title: string
  due_date?: string     // YYYY-MM-DD
  tag?: 'kid' | 'home' | 'occasion' | 'urgent' | 'other'
}

export interface AddMemberAction {
  type: 'add_member'
  name: string
  role: 'parent' | 'child' | 'caregiver'
  school?: string
  grade?: string
  age?: number
}

export type KinlyAction = AddEventAction | AddTaskAction | AddMemberAction

// ── Parse [ACTION:{...}] tag from completed Groq response ─────────────────────

export function parseActionFromResponse(text: string): {
  cleanText: string
  action: KinlyAction | null
} {
  // Match [ACTION: { ... }] — handles newlines inside the JSON
  const match = text.match(/\[ACTION:\s*(\{[\s\S]*?\})\s*\]/)
  const cleanText = text.replace(/\[ACTION:\s*\{[\s\S]*?\}\s*\]/, '').trim()

  if (!match) return { cleanText, action: null }

  try {
    const action = JSON.parse(match[1]) as KinlyAction
    if (!action.type) return { cleanText, action: null }
    return { cleanText, action }
  } catch {
    return { cleanText, action: null }
  }
}

// ── Execute a parsed action against Supabase ──────────────────────────────────

export async function executeKinlyAction(
  action: KinlyAction,
  familyId: string,
  members: Member[],
): Promise<string> {
  switch (action.type) {

    case 'add_event': {
      // Resolve member name → member_id (fuzzy first-name match)
      const memberId = action.member_name
        ? (members.find((m) =>
            m.name.toLowerCase().startsWith(action.member_name!.toLowerCase()),
          )?.id ?? null)
        : null

      const { error } = await supabase.from('events').insert({
        family_id:         familyId,
        member_id:         memberId,
        service_id:        null,
        title:             action.title,
        date:              action.date,
        time_start:        action.time_start ?? null,
        source:            'manual',
        calendar_event_id: null,
        gmail_message_id:  null,
      })
      if (error) throw new Error(error.message)
      const timeStr = action.time_start ? ` at ${fmtTime(action.time_start)}` : ''
      return `"${action.title}"${timeStr} added to calendar`
    }

    case 'add_task': {
      const { error } = await supabase.from('tasks').insert({
        family_id: familyId,
        event_id:  null,
        title:     action.title,
        due_date:  action.due_date ?? null,
        tag:       action.tag ?? 'other',
        done:      false,
        source:    'manual',
      })
      if (error) throw new Error(error.message)
      return `"${action.title}" added to your tasks`
    }

    case 'add_member': {
      const dob = action.age
        ? format(new Date(new Date().getFullYear() - action.age, 6, 1), 'yyyy-MM-dd')
        : null
      const color = action.role === 'child' ? '#AFA9EC' : '#5DCAA5'
      const { error } = await supabase.from('members').insert({
        family_id:     familyId,
        name:          action.name,
        role:          action.role,
        date_of_birth: dob,
        school:        action.school ?? null,
        grade:         action.grade ?? null,
        avatar_color:  color,
      })
      if (error) throw new Error(error.message)
      return `${action.name} added to your family`
    }
  }
}

// ── Build action-aware system suffix (injected per KinlyBar request) ──────────

export function buildActionSuffix(): string {
  const today   = format(new Date(), 'yyyy-MM-dd')
  const dayName = format(new Date(), 'EEEE, MMMM d, yyyy')

  return `

Today is ${dayName} (${today}). Use this to resolve any relative dates ("tomorrow", "next Friday", etc.).

When the user asks you to DO something, respond naturally and then append ONE action block on a new line at the very end, in this exact format:
[ACTION: {"type":"add_event","title":"Piano lesson","date":"2025-06-02","time_start":"16:00","member_name":"Lila"}]
[ACTION: {"type":"add_task","title":"Call the school","due_date":"2025-06-03","tag":"kid"}]
[ACTION: {"type":"add_member","name":"Grandma Rose","role":"caregiver","age":65}]

Rules:
- Only include fields you know — omit optional fields if not mentioned
- time_start uses 24-hour HH:MM format
- tag choices: kid, home, occasion, urgent, other
- role choices: parent, child, caregiver
- If you need more info before acting, ask — do NOT include [ACTION:] until you have enough
- For questions, updates, or general chat: NO [ACTION:] block`
}

// ── Utility ───────────────────────────────────────────────────────────────────

function fmtTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`
}
