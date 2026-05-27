import { addDays, subDays, format } from 'date-fns'
import { supabase } from './supabase'
import type {
  Member, Activity, Occasion, Provider, HomeService, FamilyEvent, Task,
  TrustedDomain, DemoFlaggedEmail
} from '../types'

const TODAY = new Date()
const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

// ─── Static demo flagged emails ───────────────────────────────────────────────
export const DEMO_EMAILS: DemoFlaggedEmail[] = [
  {
    id: 'demo-email-1',
    title: 'Parent info night — please RSVP',
    domain: 'cedarcrestacademy.org',
    preview: 'Tonight at 6:30 in the auditorium — light refreshments provided…',
    timestamp: '9:14am',
    tag: null,
    memberName: 'Lila',
  },
  {
    id: 'demo-email-2',
    title: 'Spring registration closes Friday',
    domain: 'seahawkssoccer.org',
    preview: 'Payment plus medical form must be received by 5pm Friday…',
    timestamp: '7:02am',
    tag: 'urgent',
    memberName: null,
  },
  {
    id: 'demo-email-3',
    title: 'HVAC seasonal service reminder',
    domain: 'pnwcomfort.com',
    preview: 'Time to schedule your annual tune-up before summer heat arrives…',
    timestamp: 'Mon',
    tag: 'home',
    memberName: null,
  },
  {
    id: 'demo-email-4',
    title: 'Weekly grocery delivery confirmed',
    domain: 'wholefoodsmarket.com',
    preview: 'Your order is confirmed for tomorrow between 10am–12pm…',
    timestamp: 'Mon',
    tag: null,
    memberName: null,
  },
]

// ─── Demo tasks with rich sublines ───────────────────────────────────────────
// These are shown in the home feed; subline is stored as task title prefix
// since the DB schema doesn't have a subline field. We handle this client-side
// for demo mode via the DEMO_TASKS constant.
export interface DemoTask {
  title: string
  subline: string
  tag: 'kid' | 'home' | 'occasion' | 'urgent' | 'other' | 'shopping' | 'gmail'
  urgency: 'Overdue' | 'Today' | 'This week'
  memberName?: string
}

export const DEMO_TASKS: DemoTask[] = [
  {
    title: 'House cleaning overdue by 3 days',
    subline: 'Bi-weekly cycle · last visit May 10 · Maria\'s Cleaning Co.',
    tag: 'home',
    urgency: 'Overdue',
  },
  {
    title: 'Complete soccer registration',
    subline: 'From seahawkssoccer.org · payment + medical form · closes Fri',
    tag: 'urgent',
    urgency: 'Today',
    memberName: 'Lila',
  },
  {
    title: 'Confirm Saturday babysitter',
    subline: 'Jess Nguyen for anniversary dinner · text to confirm',
    tag: 'occasion',
    urgency: 'Today',
  },
  {
    title: 'Plan Noah\'s birthday',
    subline: 'Birthday in 3 weeks · venue + invites needed',
    tag: 'kid',
    urgency: 'This week',
    memberName: 'Noah',
  },
  {
    title: 'HVAC service appointment',
    subline: 'Due in 2 weeks · PNW Comfort Systems · call to schedule',
    tag: 'home',
    urgency: 'This week',
  },
]

// ─── Demo events with rich sublines ──────────────────────────────────────────
export interface DemoEvent {
  title: string
  timeStart: string
  subline: string
  memberName?: string
  daily?: boolean
}

export const DEMO_EVENTS: DemoEvent[] = [
  {
    title: 'Family morning sync',
    timeStart: '09:00',
    subline: '15 min · review the day\'s plan over coffee',
    daily: true,
  },
  {
    title: 'School pickup — Lila',
    timeStart: '15:15',
    subline: 'Cedar Crest north gate · 1.2 mi',
    memberName: 'Lila',
  },
  {
    title: 'Piano lesson',
    timeStart: '16:00',
    subline: 'Ms. Chen · Studio B · recurring weekly',
    memberName: 'Lila',
  },
  {
    title: 'Parent info night',
    timeStart: '18:30',
    subline: 'Cedar Crest Academy · auditorium · bring signed form',
    memberName: 'Lila',
  },
  {
    title: 'Lila\'s swim meet',
    timeStart: '19:00',
    subline: 'Bellevue Aquatic Center · heat 3, lane 2',
    memberName: 'Lila',
  },
]

// ─── Seed function ────────────────────────────────────────────────────────────
export async function seedDemoFamily(userId: string): Promise<string> {
  // 1. Create family (RLS disabled on families table — low risk, scoped via user_families)
  const { data: family, error: famErr } = await supabase
    .from('families')
    .insert({ name: 'The Martins', is_demo: true })
    .select()
    .single()

  if (famErr || !family) throw famErr || new Error('Failed to create family')
  const familyId: string = family.id

  // 2. Link the user to the family
  const { error: ufErr } = await supabase
    .from('user_families')
    .insert({ user_id: userId, family_id: familyId, role: 'manager' })

  if (ufErr) throw ufErr

  // 3. Members
  const memberRows: Omit<Member, 'id'>[] = [
    { family_id: familyId, name: 'Sarah Martin', role: 'parent', date_of_birth: null, school: null, grade: null, avatar_color: '#1D9E75' },
    { family_id: familyId, name: 'James Martin', role: 'parent', date_of_birth: null, school: null, grade: null, avatar_color: '#3B82F6' },
    {
      family_id: familyId, name: 'Lila Martin', role: 'child',
      date_of_birth: fmt(subDays(TODAY, 365 * 8)), school: 'Cedar Crest Academy', grade: 'Grade 3',
      avatar_color: '#8B5CF6'
    },
    {
      family_id: familyId, name: 'Noah Martin', role: 'child',
      date_of_birth: fmt(subDays(TODAY, 365 * 6)), school: 'Cedar Crest Academy', grade: 'Grade 1',
      avatar_color: '#F59E0B'
    },
  ]
  const { data: members } = await supabase.from('members').insert(memberRows).select()
  if (!members) throw new Error('Failed to create members')

  const [, , lila, noah] = members

  // 4. Activities
  const activities: Omit<Activity, 'id'>[] = [
    {
      family_id: familyId, member_id: lila.id,
      name: 'Piano lesson', days: ['Monday', 'Wednesday'],
      time_start: '16:00', time_end: '16:45',
      location: 'Studio B', provider_name: 'Ms. Chen', status: 'active'
    },
    {
      family_id: familyId, member_id: lila.id,
      name: 'Soccer practice', days: ['Tuesday', 'Thursday'],
      time_start: '17:00', time_end: '18:00',
      location: 'Seahawks FC field', provider_name: null, status: 'active'
    },
    {
      family_id: familyId, member_id: noah.id,
      name: 'Swimming', days: ['Saturday'],
      time_start: '09:00', time_end: '09:45',
      location: 'Bellevue Aquatic Center', provider_name: null, status: 'active'
    },
  ]
  await supabase.from('activities').insert(activities)

  // 5. Occasions
  const occasions: Omit<Occasion, 'id'>[] = [
    {
      family_id: familyId, member_id: lila.id,
      type: 'birthday', label: "Lila's birthday",
      date: fmt(addDays(TODAY, 21)), recurring: true,
      remind_30: true, remind_7: true, remind_1: true
    },
    {
      family_id: familyId, member_id: null,
      type: 'anniversary', label: 'Sarah & James Anniversary',
      date: fmt(addDays(TODAY, 42)), recurring: true,
      remind_30: true, remind_7: true, remind_1: true
    },
    {
      family_id: familyId, member_id: noah.id,
      type: 'birthday', label: "Noah's birthday",
      date: fmt(addDays(TODAY, 70)), recurring: true,
      remind_30: true, remind_7: true, remind_1: true
    },
  ]
  await supabase.from('occasions').insert(occasions)

  // 6. Providers
  const providers: Omit<Provider, 'id'>[] = [
    { family_id: familyId, name: "Maria's Cleaning Co.", type: 'cleaner', rating: 5, phone: null, email: null, notes: null },
    { family_id: familyId, name: 'Jess Nguyen', type: 'babysitter', rating: 5, phone: null, email: null, notes: null },
    { family_id: familyId, name: 'Ms. Chen', type: 'tutor', rating: 4, phone: null, email: null, notes: null },
  ]
  const { data: provs } = await supabase.from('providers').insert(providers).select()
  if (!provs) throw new Error('Failed to create providers')
  const [mariasCo] = provs

  // 7. Home services
  const services: Omit<HomeService, 'id'>[] = [
    {
      family_id: familyId, provider_id: mariasCo.id,
      name: 'House cleaning', frequency: 'biweekly', custom_days: null,
      last_done: fmt(subDays(TODAY, 17)),
      next_due: fmt(subDays(TODAY, 3)), // overdue
    },
    {
      family_id: familyId, provider_id: null,
      name: 'HVAC service', frequency: 'annual', custom_days: null,
      last_done: null, next_due: fmt(addDays(TODAY, 14)),
    },
  ]
  await supabase.from('home_services').insert(services)

  // 8. Events (today)
  const todayStr = fmt(TODAY)
  const tomStr = fmt(addDays(TODAY, 1))
  const thuStr = fmt(addDays(TODAY, (4 - TODAY.getDay() + 7) % 7 || 7))

  const events: Omit<FamilyEvent, 'id'>[] = [
    {
      family_id: familyId, member_id: null, service_id: null,
      title: 'Family morning sync', date: todayStr, time_start: '09:00',
      source: 'manual', calendar_event_id: null, gmail_message_id: null
    },
    {
      family_id: familyId, member_id: lila.id, service_id: null,
      title: 'School pickup — Lila', date: todayStr, time_start: '15:15',
      source: 'manual', calendar_event_id: null, gmail_message_id: null
    },
    {
      family_id: familyId, member_id: lila.id, service_id: null,
      title: 'Piano lesson', date: todayStr, time_start: '16:00',
      source: 'manual', calendar_event_id: null, gmail_message_id: null
    },
    {
      family_id: familyId, member_id: lila.id, service_id: null,
      title: 'Parent info night', date: tomStr, time_start: '18:30',
      source: 'gmail', calendar_event_id: null, gmail_message_id: 'demo-email-1'
    },
    {
      family_id: familyId, member_id: lila.id, service_id: null,
      title: 'Soccer practice', date: thuStr, time_start: '17:00',
      source: 'manual', calendar_event_id: null, gmail_message_id: null
    },
  ]
  await supabase.from('events').insert(events)

  // 9. Tasks
  const fridayStr = fmt(addDays(TODAY, (5 - TODAY.getDay() + 7) % 7 || 7))

  const tasks: Omit<Task, 'id'>[] = [
    {
      family_id: familyId, event_id: null,
      title: 'House cleaning overdue by 3 days',
      due_date: fmt(subDays(TODAY, 3)), tag: 'home', done: false, source: 'manual'
    },
    {
      family_id: familyId, event_id: null,
      title: 'Complete soccer registration',
      due_date: fridayStr, tag: 'urgent', done: false, source: 'gmail'
    },
    {
      family_id: familyId, event_id: null,
      title: 'Confirm Saturday babysitter',
      due_date: fmt(TODAY), tag: 'occasion', done: false, source: 'manual'
    },
    {
      family_id: familyId, event_id: null,
      title: "Plan Noah's birthday",
      due_date: fmt(addDays(TODAY, 21)), tag: 'kid', done: false, source: 'manual'
    },
    {
      family_id: familyId, event_id: null,
      title: 'HVAC service appointment',
      due_date: fmt(addDays(TODAY, 14)), tag: 'home', done: false, source: 'manual'
    },
  ]
  await supabase.from('tasks').insert(tasks)

  // 10. Trusted domains
  const domains: Omit<TrustedDomain, 'id'>[] = [
    { family_id: familyId, domain: 'cedarcrestacademy.org', linked_member_id: lila.id },
    { family_id: familyId, domain: 'seahawkssoccer.org', linked_member_id: lila.id },
  ]
  await supabase.from('trusted_domains').insert(domains)

  // 11. Shopping list
  const { data: list } = await supabase
    .from('shopping_lists')
    .insert({ family_id: familyId, name: 'Weekly groceries' })
    .select()
    .single()

  if (list) {
    await supabase.from('shopping_items').insert([
      { list_id: list.id, name: 'Milk', quantity: '2 gallons', checked: true },
      { list_id: list.id, name: 'Eggs', quantity: '1 dozen', checked: true },
      { list_id: list.id, name: 'Apples', quantity: '6', checked: false },
      { list_id: list.id, name: 'Bread', quantity: '1 loaf', checked: false },
      { list_id: list.id, name: 'Pasta', quantity: '2 boxes', checked: false },
      { list_id: list.id, name: 'Chicken breast', quantity: '2 lbs', checked: false },
    ])
  }

  return familyId
}
