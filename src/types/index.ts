// ─── Core domain types ───────────────────────────────────────────────────────

export interface Family {
  id: string
  name: string
  is_demo: boolean
  created_at: string
}

export interface UserFamily {
  id: string
  user_id: string
  family_id: string
  role: 'manager' | 'member'
}

export type MemberRole = 'parent' | 'child' | 'caregiver'

export interface Member {
  id: string
  family_id: string
  name: string
  role: MemberRole
  date_of_birth: string | null
  school: string | null
  grade: string | null
  avatar_color: string | null
}

export interface Activity {
  id: string
  member_id: string
  family_id: string
  name: string
  days: string[]
  time_start: string | null
  time_end: string | null
  location: string | null
  provider_name: string | null
  status: 'active' | 'paused'
}

export type OccasionType = 'birthday' | 'anniversary' | 'milestone' | 'other'

export interface Occasion {
  id: string
  family_id: string
  member_id: string | null
  type: OccasionType
  label: string
  date: string
  recurring: boolean
  remind_30: boolean
  remind_7: boolean
  remind_1: boolean
}

export type ProviderType = 'cleaner' | 'babysitter' | 'tutor' | 'contractor' | 'other'

export interface Provider {
  id: string
  family_id: string
  name: string
  type: ProviderType
  phone: string | null
  email: string | null
  notes: string | null
  rating: number | null
}

export type ServiceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'custom'

export interface HomeService {
  id: string
  family_id: string
  provider_id: string | null
  name: string
  frequency: ServiceFrequency
  custom_days: number | null
  last_done: string | null
  next_due: string | null
}

export interface ServiceHistory {
  id: string
  service_id: string
  completed_date: string
}

export interface ShoppingList {
  id: string
  family_id: string
  name: string
}

export interface ShoppingItem {
  id: string
  list_id: string
  name: string
  quantity: string | null
  checked: boolean
}

export type EventSource = 'manual' | 'gmail' | 'calendar'

export interface FamilyEvent {
  id: string
  family_id: string
  member_id: string | null
  service_id: string | null
  title: string
  date: string
  time_start: string | null
  source: EventSource
  calendar_event_id: string | null
  gmail_message_id: string | null
}

export type TaskTag = 'kid' | 'home' | 'occasion' | 'shopping' | 'urgent' | 'other' | 'gmail'

export interface Task {
  id: string
  family_id: string
  event_id: string | null
  title: string
  due_date: string | null
  tag: TaskTag | null
  done: boolean
  source: 'manual' | 'gmail'
}

export interface TrustedDomain {
  id: string
  family_id: string
  domain: string
  linked_member_id: string | null
}

export interface GoogleConnection {
  id: string
  user_id: string
  family_id: string
  access_token: string | null
  refresh_token: string | null
  token_expiry: string | null
  calendar_connected: boolean
  gmail_connected: boolean
}

// ─── App-level types ──────────────────────────────────────────────────────────

export interface FlaggedEmail {
  id: string
  title: string
  domain: string
  preview: string
  timestamp: string
  tag: TaskTag | null
  source: EventSource
}

export interface DemoFlaggedEmail {
  id: string
  title: string
  domain: string
  preview: string
  timestamp: string
  tag: TaskTag | null
  memberName?: string | null
}
