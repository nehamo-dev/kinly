import { useCallback, useEffect, useRef, useState } from 'react'
import { differenceInDays, parseISO, isAfter, startOfDay, format } from 'date-fns'
import { IconSparkles, IconCheck } from '@tabler/icons-react'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { parseMember, memberConfirmText } from '../../lib/parseMember'
import type { ParsedMember } from '../../lib/parseMember'
import type { Member, Activity, Occasion, Provider } from '../../types'

// ─── Kinly add-member input ───────────────────────────────────────────────────

interface AddMemberInputProps {
  onAdd: (parsed: ParsedMember) => Promise<void>
}

function AddMemberInput({ onAdd }: AddMemberInputProps) {
  const [value,   setValue]   = useState('')
  const [parsed,  setParsed]  = useState<ParsedMember | null>(null)
  const [adding,  setAdding]  = useState(false)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || adding) return
    setParsed(parseMember(trimmed))
  }

  async function handleConfirm() {
    if (!parsed || adding) return
    setAdding(true)
    try {
      await onAdd(parsed)
      setSuccess(true)
      setValue('')
      setParsed(null)
      setTimeout(() => setSuccess(false), 2000)
    } finally {
      setAdding(false)
    }
  }

  function handleEdit() {
    setParsed(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="mb-6">
      {/* Input bar */}
      <div
        className="flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 cursor-text"
        style={{ background: '#1A1A18' }}
        onClick={() => inputRef.current?.focus()}
      >
        <IconSparkles size={14} style={{ color: '#5F5E5A', flexShrink: 0 }} />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); setParsed(null) }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Tell Kinly about a family member..."
          className="flex-1 bg-transparent text-[13px] focus:outline-none"
          style={{ color: '#F7F4EF' }}
        />
        {value.trim() && !parsed && (
          <button
            onClick={handleSubmit}
            className="text-[11px] font-medium px-2.5 py-1 rounded-[6px] flex-shrink-0 transition-opacity hover:opacity-80"
            style={{ background: '#2C2C2A', color: '#888780' }}
          >
            →
          </button>
        )}
      </div>

      {/* Confirmation card */}
      {parsed && (
        <div
          className="mt-2 rounded-[10px] px-3.5 py-3 flex items-center justify-between gap-3"
          style={{ background: '#EEEDFE' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium truncate" style={{ color: '#3C3489' }}>
              {memberConfirmText(parsed)}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: '#7269C5' }}>
              Does that look right?
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleEdit}
              className="text-[11px] px-2 py-1 rounded-[6px] transition-opacity hover:opacity-70"
              style={{ background: 'rgba(84,74,183,0.12)', color: '#534AB7' }}
            >
              edit
            </button>
            <button
              onClick={handleConfirm}
              disabled={adding}
              className="text-[11px] font-medium px-2.5 py-1 rounded-[6px] transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: '#534AB7', color: '#FFFFFF' }}
            >
              {adding ? '…' : 'add'}
            </button>
          </div>
        </div>
      )}

      {/* Success flash */}
      {success && (
        <div
          className="mt-2 rounded-[10px] px-3.5 py-2.5 flex items-center gap-2"
          style={{ background: '#D1FAE5' }}
        >
          <IconCheck size={13} style={{ color: '#059669' }} />
          <span className="text-[11px] font-medium" style={{ color: '#059669' }}>Member added.</span>
        </div>
      )}

      {/* Hint */}
      {!parsed && !success && (
        <p className="text-[11px] mt-1.5 px-1" style={{ color: '#B4B2A9' }}>
          Try: "Lila, age 8, Cedar Crest Academy" or "James, parent"
        </p>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDays(days: string[]): string {
  const abbr: Record<string, string> = {
    Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
    Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
  }
  return days.map((d) => abbr[d] ?? d).join(', ')
}

function formatTimeRange(start: string | null, end: string | null): string {
  function fmt(t: string) {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'pm' : 'am'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')}${ampm}`
  }
  if (!start) return ''
  if (!end) return fmt(start)
  return `${fmt(start)}–${fmt(end)}`
}

function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), startOfDay(new Date()))
}

const occasionIcon: Record<string, string> = {
  birthday: '🎂',
  anniversary: '💍',
  milestone: '✨',
  other: '📅',
}

const providerTypeLabel: Record<string, string> = {
  cleaner: 'Cleaner',
  babysitter: 'Babysitter',
  tutor: 'Tutor',
  contractor: 'Contractor',
  other: 'Provider',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MemberCard({ member }: { member: Member }) {
  const isChild = member.role === 'child'
  return (
    <div className="flex flex-col items-center gap-2 min-w-[80px]">
      <Avatar name={member.name} color={member.avatar_color} size="lg" />
      <div className="text-center">
        <p className="text-sm font-medium text-slate-800 leading-tight">
          {member.name.split(' ')[0]}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {isChild && member.grade ? member.grade : member.role === 'parent' ? 'Parent' : member.role}
        </p>
        {isChild && member.school && (
          <p className="text-xs text-slate-400 truncate max-w-[80px]">{member.school.split(' ')[0]}</p>
        )}
      </div>
    </div>
  )
}

function ActivityRow({ activity, member }: { activity: Activity; member?: Member }) {
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-slate-100 last:border-0">
      {member
        ? <Avatar name={member.name} color={member.avatar_color} size="sm" className="mt-0.5" />
        : <div className="w-7 h-7 rounded-full bg-slate-100 flex-shrink-0 mt-0.5" />
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-slate-800">{activity.name}</span>
          {member && (
            <Badge variant="kid">{member.name.split(' ')[0]}</Badge>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {formatDays(activity.days)}
          {activity.time_start && ` · ${formatTimeRange(activity.time_start, activity.time_end)}`}
          {activity.location && ` · ${activity.location}`}
        </p>
      </div>
    </div>
  )
}

function OccasionRow({ occasion, member }: { occasion: Occasion; member?: Member }) {
  const days = daysUntil(occasion.date)
  const icon = occasionIcon[occasion.type] ?? '📅'
  const dateFormatted = parseISO(occasion.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-slate-100 last:border-0">
      <span className="text-xl flex-shrink-0 w-8 text-center" aria-hidden>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-slate-800">{occasion.label}</span>
          {member && <Badge variant="kid">{member.name.split(' ')[0]}</Badge>}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{dateFormatted}</p>
      </div>
      <span className={`text-xs font-semibold flex-shrink-0 ${
        days <= 7 ? 'text-[#E8392A]' : days <= 30 ? 'text-amber-600' : 'text-slate-400'
      }`}>
        {days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `in ${days}d`}
      </span>
    </div>
  )
}

function StarRating({ rating }: { rating: number | null }) {
  const stars = Math.round(rating ?? 0)
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < stars ? 'text-amber-400' : 'text-slate-200'}`}
          viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z" />
        </svg>
      ))}
    </div>
  )
}

function ProviderRow({ provider }: { provider: Provider }) {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{provider.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400">{providerTypeLabel[provider.type] ?? provider.type}</span>
          {provider.rating && (
            <>
              <span className="text-slate-200">·</span>
              <StarRating rating={provider.rating} />
            </>
          )}
        </div>
      </div>
      {(provider.phone || provider.email) && (
        <a
          href={provider.phone ? `tel:${provider.phone}` : `mailto:${provider.email}`}
          className="text-xs text-[#E8392A] hover:underline flex-shrink-0"
        >
          {provider.phone ?? provider.email}
        </a>
      )}
    </div>
  )
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function MemberSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 min-w-[80px] animate-pulse">
      <div className="w-11 h-11 rounded-full bg-slate-100" />
      <div className="w-14 h-3 bg-slate-100 rounded" />
      <div className="w-10 h-3 bg-slate-100 rounded" />
    </div>
  )
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-slate-100 last:border-0 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-slate-100 rounded w-2/5" />
        <div className="h-3 bg-slate-100 rounded w-3/5" />
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function Family() {
  const familyId = useAuthStore((s) => s.familyId)

  const [members,    setMembers]    = useState<Member[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [occasions,  setOccasions]  = useState<Occasion[]>([])
  const [providers,  setProviders]  = useState<Provider[]>([])
  const [loading,    setLoading]    = useState(true)

  const loadData = useCallback(async () => {
    if (!familyId) return
    setLoading(true)
    try {
      const [mRes, aRes, oRes, pRes] = await Promise.all([
        supabase.from('members').select('*').eq('family_id', familyId).order('role'),
        supabase.from('activities').select('*').eq('family_id', familyId),
        supabase.from('occasions').select('*').eq('family_id', familyId).order('date'),
        supabase.from('providers').select('*').eq('family_id', familyId),
      ])
      setMembers((mRes.data as Member[]) ?? [])
      setActivities((aRes.data as Activity[]) ?? [])
      const today = startOfDay(new Date())
      setOccasions(
        ((oRes.data as Occasion[]) ?? []).filter((o) => !isAfter(today, parseISO(o.date)))
      )
      setProviders((pRes.data as Provider[]) ?? [])
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => { void loadData() }, [loadData])

  const memberById = (id: string | null) => members.find((m) => m.id === id)

  // ── Add member via Kinly input ─────────────────────────────────────────────
  async function addMember(parsed: ParsedMember) {
    if (!familyId) return
    // Approximate date_of_birth from age
    const dob = parsed.age
      ? format(new Date(new Date().getFullYear() - parsed.age, 0, 1), 'yyyy-MM-dd')
      : null

    await supabase.from('members').insert({
      family_id:    familyId,
      name:         parsed.name,
      role:         parsed.role,
      date_of_birth: dob,
      school:       parsed.school,
      grade:        parsed.grade,
      avatar_color: parsed.role === 'child' ? '#8B5CF6' : '#64748B',
    })
    await loadData()
  }

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Family</h1>
        <p className="text-sm text-slate-400 mt-1">Members, activities, and upcoming occasions</p>
      </div>

      {/* ── Kinly add-member input ── */}
      <AddMemberInput onAdd={addMember} />

      {/* ── Members ── */}
      <section className="mb-8">
        <SectionHeader label="Members" count={loading ? undefined : members.length} />
        <Card>
          <div className="flex gap-6 overflow-x-auto pb-1">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <MemberSkeleton key={i} />)
              : members.length === 0
              ? <p className="text-sm text-slate-400">No members yet</p>
              : members.map((m) => <MemberCard key={m.id} member={m} />)
            }
          </div>
        </Card>
      </section>

      {/* ── Activities ── */}
      <section className="mb-8">
        <SectionHeader label="Activities" count={loading ? undefined : activities.length} />
        <Card padding="none">
          <div className="px-4">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
              : activities.length === 0
              ? <p className="text-sm text-slate-400 py-6 text-center">No activities yet</p>
              : activities.map((a) => (
                  <ActivityRow key={a.id} activity={a} member={memberById(a.member_id)} />
                ))
            }
          </div>
        </Card>
      </section>

      {/* ── Upcoming Occasions ── */}
      <section className="mb-8">
        <SectionHeader label="Upcoming Occasions" count={loading ? undefined : occasions.length} />
        <Card padding="none">
          <div className="px-4">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
              : occasions.length === 0
              ? <p className="text-sm text-slate-400 py-6 text-center">No upcoming occasions</p>
              : occasions.map((o) => (
                  <OccasionRow key={o.id} occasion={o} member={memberById(o.member_id ?? null) ?? undefined} />
                ))
            }
          </div>
        </Card>
      </section>

      {/* ── Providers ── */}
      <section className="mb-8">
        <SectionHeader label="Providers" count={loading ? undefined : providers.length} />
        <Card padding="none">
          <div className="px-4">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
              : providers.length === 0
              ? <p className="text-sm text-slate-400 py-6 text-center">No providers yet</p>
              : providers.map((p) => <ProviderRow key={p.id} provider={p} />)
            }
          </div>
        </Card>
      </section>
    </PageWrapper>
  )
}
