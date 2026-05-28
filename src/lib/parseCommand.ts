/**
 * parseCommand — lightweight natural-language parser for the Kinly command bar.
 *
 * Given a free-text string like "Pick up Lila from school on Friday at 3pm",
 * it returns a structured ParsedCommand with type, title, date, time, and tag.
 *
 * No API call — pure date-fns + regex, runs synchronously.
 */

import {
  format,
  addDays,
  addWeeks,
  nextMonday,
  nextTuesday,
  nextWednesday,
  nextThursday,
  nextFriday,
  nextSaturday,
  nextSunday,
  startOfDay,
  getDay,
} from 'date-fns'

export interface ParsedCommand {
  type: 'task' | 'event'
  title: string
  date: string | null  // yyyy-MM-dd
  time: string | null  // HH:mm
  tag: string | null
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

type NextDayFn = (d: Date) => Date

const WEEKDAY_FNS: Record<string, NextDayFn> = {
  monday: nextMonday,
  tuesday: nextTuesday,
  wednesday: nextWednesday,
  thursday: nextThursday,
  friday: nextFriday,
  saturday: nextSaturday,
  sunday: nextSunday,
  mon: nextMonday,
  tue: nextTuesday,
  wed: nextWednesday,
  thu: nextThursday,
  fri: nextFriday,
  sat: nextSaturday,
  sun: nextSunday,
}

// Date patterns — each has a `re` and a resolver that converts the match to a Date
interface DatePattern {
  re: RegExp
  resolve: (m: RegExpMatchArray, today: Date) => Date | null
}

const DATE_PATTERNS: DatePattern[] = [
  // "in 3 days" / "in 2 weeks"
  {
    re: /\bin\s+(\d+)\s+(days?|weeks?)\b/i,
    resolve: (m, today) =>
      m[2].startsWith('week') ? addWeeks(today, +m[1]) : addDays(today, +m[1]),
  },
  // "next Monday" / "on Tuesday" / "this Friday" / bare weekday
  {
    re: /\b(?:next\s+|this\s+|on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i,
    resolve: (m, today) => {
      const fn = WEEKDAY_FNS[m[1].toLowerCase()]
      if (!fn) return null
      const candidate = fn(today)
      // If "on [day]" and today is that day, return today rather than next week
      const todayDow = getDay(today) // 0=Sun
      const matchDow = getDay(candidate)
      if (todayDow === matchDow) return today
      return candidate
    },
  },
  // "tomorrow"
  {
    re: /\btomorrow\b/i,
    resolve: (_m, today) => addDays(today, 1),
  },
  // "today"
  {
    re: /\btoday\b/i,
    resolve: (_m, today) => today,
  },
]

function parseDate(input: string): { date: string | null; title: string } {
  const today = startOfDay(new Date())
  let title = input

  for (const { re, resolve } of DATE_PATTERNS) {
    const m = title.match(re)
    if (m) {
      const d = resolve(m, today)
      if (d) {
        title = title.replace(m[0], ' ').replace(/\s{2,}/g, ' ').trim()
        return { date: format(d, 'yyyy-MM-dd'), title }
      }
    }
  }

  return { date: null, title }
}

// ─── Time parsing ─────────────────────────────────────────────────────────────

const TIME_PATTERNS: { re: RegExp; resolve: (m: RegExpMatchArray) => string }[] = [
  // "at noon"
  { re: /\bat\s+noon\b/i, resolve: () => '12:00' },
  // "at midnight"
  { re: /\bat\s+midnight\b/i, resolve: () => '00:00' },
  // "at 3:30pm" / "at 9am" / "at 14:00"
  {
    re: /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
    resolve: (m) => {
      let h = +m[1]
      const min = m[2] ? +m[2] : 0
      const ampm = m[3]?.toLowerCase()
      if (ampm === 'pm' && h < 12) h += 12
      if (ampm === 'am' && h === 12) h = 0
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    },
  },
]

function parseTime(input: string): { time: string | null; title: string } {
  let title = input

  for (const { re, resolve } of TIME_PATTERNS) {
    const m = title.match(re)
    if (m) {
      const time = resolve(m)
      title = title.replace(m[0], ' ').replace(/\s{2,}/g, ' ').trim()
      return { time, title }
    }
  }

  return { time: null, title }
}

// ─── Intent detection ─────────────────────────────────────────────────────────

const EVENT_WORDS = [
  'meeting', 'appointment', 'lesson', 'pickup', 'pick up', 'pick-up',
  'practice', 'class', 'game', 'concert', 'show', 'dinner', 'lunch',
  'breakfast', 'brunch', 'interview', 'conference', 'session', 'checkup',
  'check-up', 'recital', 'playdate', 'play date', 'party', 'visit',
  'drop off', 'dropoff', 'drop-off',
]

const TASK_WORDS = [
  'buy', 'order', 'book', 'pay', 'call', 'email', 'remind', 'fix',
  'clean', 'organize', 'organise', 'fill', 'complete', 'register',
  'submit', 'send', 'schedule', 'plan', 'research', 'check', 'confirm',
  'cancel', 'renew', 'update', 'sign',
]

function detectIntent(input: string, time: string | null): 'task' | 'event' {
  const t = input.toLowerCase()
  // If a time was given, lean toward event
  if (time) return 'event'
  const hasEvent = EVENT_WORDS.some((w) => t.includes(w))
  const hasTask = TASK_WORDS.some((w) => t.includes(w))
  if (hasEvent && !hasTask) return 'event'
  return 'task'
}

// ─── Tag detection ────────────────────────────────────────────────────────────

const TAG_PATTERNS: { re: RegExp; tag: string }[] = [
  { re: /\b(clean|cleaning|laundry|repair|fix|maintenance|hvac|plumb|electric|lawn|garden|mow|trash|garbage|recycl)\b/i, tag: 'home' },
  { re: /\b(school|homework|class|tutor|soccer|football|basketball|tennis|piano|swim|sport|violin|guitar|dance|lila|noah|kid|kids|child|children|grade|teacher)\b/i, tag: 'kid' },
  { re: /\b(birthday|anniversary|graduation|wedding|milestone|celebrat)\b/i, tag: 'occasion' },
  { re: /\b(urgent|asap|emergency|deadline|critical)\b/i, tag: 'urgent' },
  { re: /\b(buy|groceries?|grocery|store|shop|shopping|amazon|walmart|target|market)\b/i, tag: 'shopping' },
]

function detectTag(input: string): string | null {
  for (const { re, tag } of TAG_PATTERNS) {
    if (re.test(input)) return tag
  }
  return null
}

// ─── Title cleanup ─────────────────────────────────────────────────────────────

function cleanTitle(title: string): string {
  // Strip leading filler verbs that users type before the real content
  let t = title
    .replace(/^\s*(add|create|new|set|make|schedule|remind me to|remind me about|add a|add an|create a|create an|new a|new an|set a|set an)\s+/i, '')
    .replace(/\s*(,|\.)\s*$/, '') // trailing punctuation
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!t) t = title.trim()

  // Capitalise first letter
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim()
  if (!trimmed) {
    return { type: 'task', title: '', date: null, time: null, tag: null }
  }

  // Order matters: parse date first, then time, from the result
  const { date, title: afterDate } = parseDate(trimmed)
  const { time, title: afterTime } = parseTime(afterDate)

  const type = detectIntent(trimmed, time)
  const tag = detectTag(trimmed)
  const title = cleanTitle(afterTime)

  return { type, title, date, time, tag }
}
