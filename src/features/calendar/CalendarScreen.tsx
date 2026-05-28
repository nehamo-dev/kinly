import { useCallback, useEffect, useState } from 'react'
import {
  format, addWeeks, subWeeks, startOfWeek, addDays, isToday, parseISO,
} from 'date-fns'
import { PageWrapper } from '../../components/layout/PageWrapper'
import { EventDetailModal } from '../home/EventDetailModal'
import { AddEventModal } from '../home/AddEventModal'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import type { FamilyEvent, Member } from '../../types'

// ─── Week helpers ─────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  if (format(weekStart, 'MMM') === format(end, 'MMM')) {
    return `${format(weekStart, 'MMM d')}–${format(end, 'd')}`
  }
  return `${format(weekStart, 'MMM d')} – ${format(end, 'MMM d')}`
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, '0')}${ampm}`
}

// Member color → event dot color
function memberDotColor(member: Member | undefined): string {
  return member?.avatar_color ?? '#5DCAA5'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string
  active: boolean
  dotColor?: string
  onClick: () => void
}

function FilterChip({ label, active, dotColor, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full text-[11px] font-medium px-2.5 py-1 flex-shrink-0 transition-colors"
      style={{
        background: active ? '#1A1A18' : '#EDE9E2',
        color: active ? '#F7F4EF' : '#5F5E5A',
      }}
    >
      {dotColor && (
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: active ? 'rgba(255,255,255,0.5)' : dotColor }}
        />
      )}
      {label}
    </button>
  )
}

interface EventCardProps {
  event: FamilyEvent
  memberName: string | null
  memberColor: string
  onClick: () => void
}

function EventCard({ event, memberName, memberColor, onClick }: EventCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] transition-colors hover:opacity-80"
      style={{
        background: '#FFFFFF',
        borderLeft: `3px solid ${memberColor}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <span
        className="text-[11px] w-[38px] flex-shrink-0 tabular-nums"
        style={{ color: '#B4B2A9' }}
      >
        {fmtTime(event.time_start)}
      </span>
      <span className="flex-1 text-[13px] font-medium leading-snug truncate" style={{ color: '#1A1A18' }}>
        {event.title}
      </span>
      {memberName && (
        <span
          className="text-[10px] font-medium rounded-full px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap"
          style={{ background: '#EEEDFE', color: '#534AB7' }}
        >
          {memberName}
        </span>
      )}
    </button>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function CalendarScreen() {
  const familyId = useAuthStore((s) => s.familyId)

  const [weekStart,    setWeekStart]    = useState(() => getWeekStart(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const [memberFilter, setMemberFilter] = useState<string | null>(null)
  const [events,       setEvents]       = useState<FamilyEvent[]>([])
  const [members,      setMembers]      = useState<Member[]>([])
  const [loading,      setLoading]      = useState(true)

  const [detailEvent, setDetailEvent] = useState<FamilyEvent | null>(null)
  const [addForDate,  setAddForDate]  = useState<string | null>(null)

  const weekDays = getWeekDays(weekStart)
  const weekEnd  = weekDays[6]

  const loadData = useCallback(async () => {
    if (!familyId) return
    setLoading(true)
    try {
      const [evRes, memRes] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .eq('family_id', familyId)
          .gte('date', toDateStr(weekStart))
          .lte('date', toDateStr(weekEnd))
          .order('time_start'),
        supabase.from('members').select('*').eq('family_id', familyId),
      ])
      setEvents((evRes.data  as FamilyEvent[]) ?? [])
      setMembers((memRes.data as Member[])     ?? [])
    } finally {
      setLoading(false)
    }
  }, [familyId, weekStart]) // weekEnd derived from weekStart

  useEffect(() => { void loadData() }, [loadData])

  // If week changes and selected date is outside new week, snap to the Monday
  useEffect(() => {
    const weekDateStrs = getWeekDays(weekStart).map(toDateStr)
    if (!weekDateStrs.includes(selectedDate)) {
      setSelectedDate(toDateStr(weekStart))
    }
  }, [weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  const memberById = (id: string | null) => members.find((m) => m.id === id)

  function eventsForDate(dateStr: string): FamilyEvent[] {
    return events.filter((e) => e.date === dateStr)
  }

  function filteredSelectedEvents(): FamilyEvent[] {
    const dayEvs = eventsForDate(selectedDate)
    if (!memberFilter) return dayEvs
    return dayEvs.filter((e) => e.member_id === memberFilter)
  }

  // Up to 3 colored dots per day cell
  function getDayDots(day: Date): string[] {
    const dayEvs = eventsForDate(toDateStr(day))
    return dayEvs.slice(0, 3).map((e) => memberDotColor(memberById(e.member_id ?? null) ?? undefined))
  }

  return (
    <PageWrapper>
      {/* Modals */}
      <EventDetailModal
        event={detailEvent}
        memberName={detailEvent ? (memberById(detailEvent.member_id ?? null)?.name?.split(' ')[0] ?? null) : null}
        subline={null}
        onClose={() => setDetailEvent(null)}
      />
      <AddEventModal
        open={addForDate !== null}
        onClose={() => setAddForDate(null)}
        familyId={familyId}
        onSaved={() => { setAddForDate(null); void loadData() }}
        defaultDate={addForDate ?? undefined}
      />

      {/* ── Header row ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekStart((w) => getWeekStart(subWeeks(w, 1)))}
            className="p-1.5 rounded-[8px] transition-colors hover:opacity-70"
            style={{ background: '#EDE9E2', color: '#5F5E5A' }}
            aria-label="Previous week"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>
          <span className="text-[14px] font-semibold" style={{ color: '#1A1A18' }}>
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={() => setWeekStart((w) => getWeekStart(addWeeks(w, 1)))}
            className="p-1.5 rounded-[8px] transition-colors hover:opacity-70"
            style={{ background: '#EDE9E2', color: '#5F5E5A' }}
            aria-label="Next week"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
              <path d="M6 3l5 5-5 5" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => setAddForDate(selectedDate)}
          className="flex items-center gap-1.5 text-[12px] font-medium rounded-[8px] px-3 py-1.5 transition-opacity hover:opacity-70"
          style={{ background: '#1A1A18', color: '#F7F4EF' }}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3">
            <path d="M8 1v14M1 8h14" />
          </svg>
          Add event
        </button>
      </div>

      {/* ── Member filter chips ───────────────────────────────────────────── */}
      {!loading && members.length > 0 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-0.5">
          <FilterChip
            label="All"
            active={!memberFilter}
            onClick={() => setMemberFilter(null)}
          />
          {members.map((m) => (
            <FilterChip
              key={m.id}
              label={m.name.split(' ')[0]}
              active={memberFilter === m.id}
              dotColor={m.avatar_color ?? '#B4B2A9'}
              onClick={() => setMemberFilter(memberFilter === m.id ? null : m.id)}
            />
          ))}
        </div>
      )}

      {/* ── 7-day horizontal strip ────────────────────────────────────────── */}
      <div
        className="flex gap-1 mb-5 rounded-[12px] p-1.5"
        style={{ background: '#F3F0EA' }}
      >
        {weekDays.map((day) => {
          const dateStr   = toDateStr(day)
          const isSelected = dateStr === selectedDate
          const today      = isToday(day)
          const dots       = getDayDots(day)

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className="flex-1 flex flex-col items-center py-2 px-0.5 rounded-[9px] transition-all"
              style={{
                background: isSelected ? '#1A1A18' : today && !isSelected ? '#E8E4DC' : 'transparent',
              }}
            >
              <span
                className="text-[9px] uppercase tracking-wide block"
                style={{ color: isSelected ? '#888780' : '#B4B2A9' }}
              >
                {format(day, 'EEE')}
              </span>
              <span
                className="text-[15px] font-semibold mt-0.5 block"
                style={{ color: isSelected ? '#F7F4EF' : today ? '#1A1A18' : '#5F5E5A' }}
              >
                {format(day, 'd')}
              </span>
              {/* Dots */}
              <div className="flex gap-[3px] mt-1.5 h-[5px] items-center">
                {dots.length === 0 ? null : dots.map((color, i) => (
                  <span
                    key={i}
                    className="rounded-full"
                    style={{
                      width: 5,
                      height: 5,
                      background: isSelected ? 'rgba(255,255,255,0.35)' : color,
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Selected day event list ───────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-medium" style={{ color: '#1A1A18' }}>
          {format(parseISO(selectedDate), 'EEEE, MMMM d')}
          {isToday(parseISO(selectedDate)) && (
            <span className="ml-2 text-[11px] font-normal" style={{ color: '#B4B2A9' }}>today</span>
          )}
        </h2>
        <button
          onClick={() => setAddForDate(selectedDate)}
          className="text-[11px] transition-opacity hover:opacity-70"
          style={{ color: '#B4B2A9' }}
        >
          + add
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded-[10px]" style={{ background: '#EFEFEF' }} />
          ))}
        </div>
      ) : filteredSelectedEvents().length === 0 ? (
        <p className="text-[12px] py-4 text-center" style={{ color: '#B4B2A9' }}>
          {memberFilter ? 'No events for this person today.' : 'Nothing scheduled.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredSelectedEvents().map((event) => {
            const m = memberById(event.member_id ?? null)
            return (
              <EventCard
                key={event.id}
                event={event}
                memberName={m?.name?.split(' ')[0] ?? null}
                memberColor={m?.avatar_color ?? '#5DCAA5'}
                onClick={() => setDetailEvent(event)}
              />
            )
          })}
        </div>
      )}
    </PageWrapper>
  )
}
