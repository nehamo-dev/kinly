import { useCallback, useEffect, useRef, useState } from 'react'
import { format, addWeeks, subWeeks, startOfWeek, addDays, isToday, parseISO } from 'date-fns'
import { IconChevronLeft, IconChevronRight, IconSparkles } from '@tabler/icons-react'
import { KinlyBar } from '../../components/shared/KinlyBar'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import type { FamilyEvent, Member, Occasion } from '../../types'

// ─── Design tokens ────────────────────────────────────────────────────────────

type Category = 'kid' | 'family' | 'home' | 'us'

const CAT: Record<Category, { dot: string; border: string; chipBg: string; chipText: string }> = {
  kid:    { dot: '#AFA9EC', border: '#AFA9EC', chipBg: '#EEEDFE', chipText: '#534AB7' },
  family: { dot: '#EF9F27', border: '#EF9F27', chipBg: '#EDE9E2', chipText: '#5F5E5A' },
  home:   { dot: '#5DCAA5', border: '#5DCAA5', chipBg: '#E1F5EE', chipText: '#085041' },
  us:     { dot: '#ED93B1', border: '#ED93B1', chipBg: '#FBEAF0', chipText: '#993556' },
}


const DEMO_FOR_YOU = [
  { title: "Lila's all set to play",        subtitle: "Soccer form ready · closes Friday 5pm", agentLine: "one tap and it's done" },
  { title: 'Saturday night is almost sorted', subtitle: 'Jess just needs a quick text',          agentLine: 'Kinly wrote it · just send' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weekStart(d: Date): Date { return startOfWeek(d, { weekStartsOn: 1 }) }
function weekDays(ws: Date): Date[] { return Array.from({ length: 7 }, (_, i) => addDays(ws, i)) }
function toStr(d: Date): string { return format(d, 'yyyy-MM-dd') }

function fmtTime(t: string | null | undefined): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'pm' : 'am'
  const hr = h % 12 || 12
  return m === 0 ? `${hr}:00 ${suffix}` : `${hr}:${String(m).padStart(2, '0')} ${suffix}`
}

function getCategory(ev: FamilyEvent, members: Member[]): Category {
  if (!ev.member_id) return 'family'
  const m = members.find((x) => x.id === ev.member_id)
  if (!m) return 'family'
  if (m.role === 'child') return 'kid'
  if (m.role === 'parent') return 'us'
  return 'family'
}

function memberLabel(ev: FamilyEvent, members: Member[]): string {
  if (!ev.member_id) return 'family'
  const m = members.find((x) => x.id === ev.member_id)
  if (!m) return 'family'
  return m.name.split(' ')[0]
}

function isEventPast(ev: FamilyEvent): boolean {
  const today = toStr(new Date())
  if (ev.date < today) return true
  if (ev.date > today) return false
  if (!ev.time_start) return false
  const now = new Date()
  const [h, m] = ev.time_start.split(':').map(Number)
  return h * 60 + m < now.getHours() * 60 + now.getMinutes() - 60
}

function getNextEventId(events: FamilyEvent[]): string | null {
  const today = toStr(new Date())
  const now   = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const todayEvs = events
    .filter((e) => e.date === today && e.time_start)
    .sort((a, b) => (a.time_start ?? '').localeCompare(b.time_start ?? ''))
  const next = todayEvs.find((e) => {
    const [h, m] = (e.time_start ?? '00:00').split(':').map(Number)
    return h * 60 + m >= nowMin - 60
  })
  return next?.id ?? null
}

function occasionLabel(dateStr: string): string {
  const d    = parseISO(dateStr)
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000)
  if (days <= 0)  return format(d, 'MMM d')
  if (days <= 7)  return `${format(d, 'EEE')} · ${format(d, 'MMM d')}`
  if (days <= 30) return `${format(d, 'MMM d')} · in ${Math.round(days / 7)}w`
  return `${format(d, 'MMM d')} · in ${days}d`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// CalendarHeader ──────────────────────────────────────────────────────────────
interface HeaderProps {
  selectedDate: string
  weekDaysList: Date[]
  dotMap: Record<string, Category[]>
  onDaySelect: (d: string) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

function CalendarHeader({ selectedDate, weekDaysList, dotMap, onDaySelect, onPrev, onNext, onToday }: HeaderProps) {
  const monthLabel = format(weekDaysList[0], 'MMMM yyyy')
  return (
    <div style={{ background: '#1A1A18', padding: '16px 28px 18px', flexShrink: 0 }}>
      {/* Row 1 — month + nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span style={{ fontSize: 15, fontWeight: 500, color: '#F7F4EF', letterSpacing: '-0.3px' }}>
            {monthLabel}
          </span>
          <button
            onClick={onToday}
            className="transition-colors hover:opacity-80"
            style={{ background: '#2C2C2A', color: '#888780', fontSize: 11, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer' }}
          >
            today
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className="p-1.5 transition-colors" style={{ color: '#5F5E5A', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#F7F4EF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#5F5E5A')}
          >
            <IconChevronLeft size={16} />
          </button>
          <button onClick={onNext} className="p-1.5 transition-colors" style={{ color: '#5F5E5A', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#F7F4EF')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#5F5E5A')}
          >
            <IconChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Row 2 — 7-day strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {weekDaysList.map((day) => {
          const ds       = toStr(day)
          const selected = ds === selectedDate
          const today    = isToday(day)
          const past     = ds < toStr(new Date()) && !today
          const dots     = (dotMap[ds] ?? []).slice(0, 3)

          let bg        = 'transparent'
          let nameColor = past ? '#3A3A38' : '#5F5E5A'
          let numColor  = past ? '#3A3A38' : '#5F5E5A'

          if (selected && !today) { bg = '#2C2C2A'; nameColor = '#888780'; numColor = '#F7F4EF' }
          if (selected && today)  { bg = '#2C2C2A'; nameColor = '#888780'; numColor = '#F7F4EF' }
          // Today-not-selected: cream pill
          if (today && !selected) {
            bg = '#F7F4EF'; nameColor = '#1A1A18'; numColor = '#1A1A18'
          }

          return (
            <button
              key={ds}
              onClick={() => onDaySelect(ds)}
              className="flex flex-col items-center transition-all"
              style={{ background: bg, borderRadius: 8, padding: '6px 2px 8px', cursor: 'pointer', border: 'none' }}
              onMouseEnter={(e) => { if (!selected && !today) e.currentTarget.style.background = '#232320' }}
              onMouseLeave={(e) => { if (!selected && !today) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: nameColor }}>
                {format(day, 'EEE')}
              </span>
              <span style={{ fontSize: 17, fontWeight: 500, color: numColor, marginTop: 3 }}>
                {format(day, 'd')}
              </span>
              <div style={{ display: 'flex', gap: 3, marginTop: 5, height: 5, alignItems: 'center' }}>
                {dots.map((cat, i) => (
                  <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: selected ? 'rgba(255,255,255,0.35)' : past ? '#3A3A38' : CAT[cat].dot, display: 'block', flexShrink: 0 }} />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// EventCard ───────────────────────────────────────────────────────────────────
interface EventCardProps {
  ev: FamilyEvent
  members: Member[]
  isCurrent: boolean
}

function EventCard({ ev, members, isCurrent }: EventCardProps) {
  const cat    = getCategory(ev, members)
  const label  = memberLabel(ev, members)
  const past   = isEventPast(ev)
  const border = isCurrent ? '#EF9F27' : CAT[cat].border

  return (
    <div
      className="flex items-start gap-3 transition-colors"
      style={{
        background: '#fff',
        border: '0.5px solid #E8E4DC',
        borderLeft: `3px solid ${border}`,
        borderRadius: '0 10px 10px 0',
        padding: '11px 15px',
        marginBottom: 7,
        opacity: past ? 0.4 : 1,
        cursor: 'default',
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 500, color: '#888780', minWidth: 44, flexShrink: 0, paddingTop: 2 }}>
        {fmtTime(ev.time_start)}
      </span>
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1A1A18', lineHeight: 1.35 }}>
        {ev.title}
      </span>
      <span
        className="flex-shrink-0"
        style={{ background: CAT[cat].chipBg, color: CAT[cat].chipText, fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, marginTop: 2, whiteSpace: 'nowrap' }}
      >
        {label}
      </span>
    </div>
  )
}

// DayGroup ────────────────────────────────────────────────────────────────────
interface DayGroupProps {
  date: Date
  events: FamilyEvent[]
  members: Member[]
  currentEventId: string | null
  groupRef: (el: HTMLDivElement | null) => void
}

function DayGroup({ date, events, members, currentEventId, groupRef }: DayGroupProps) {
  if (events.length === 0) return null
  const today   = isToday(date)
  const isPast  = toStr(date) < toStr(new Date()) && !today
  return (
    <div ref={groupRef} data-date={toStr(date)} style={{ marginBottom: 24, opacity: isPast ? 0.55 : 1 }}>
      <div className="flex items-center gap-2" style={{ paddingBottom: 10, borderBottom: '0.5px solid #EEEDE8', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: isPast ? '#888780' : '#1A1A18' }}>
          {format(date, 'EEEE, MMMM d')}
        </span>
        {today && (
          <span style={{ background: '#FDF0DC', color: '#EF9F27', fontSize: 11, fontWeight: 500, padding: '2px 9px', borderRadius: 20 }}>
            today
          </span>
        )}
      </div>
      {events
        .slice()
        .sort((a, b) => (a.time_start ?? '').localeCompare(b.time_start ?? ''))
        .map((ev) => (
          <EventCard key={ev.id} ev={ev} members={members} isCurrent={ev.id === currentEventId} />
        ))}
    </div>
  )
}

// SidePanel ───────────────────────────────────────────────────────────────────
interface SidePanelProps {
  weekEvents: FamilyEvent[]
  members: Member[]
  occasions: Occasion[]
  isDemo: boolean
}

function SidePanel({ weekEvents, members, occasions, isDemo }: SidePanelProps) {
  // "this week" — member + event count
  type WeekRow = { label: string; color: string; count: number }
  const weekRows: WeekRow[] = []

  const kidCounts: Record<string, number> = {}
  let familyCount = 0
  let homeCount   = 0
  let usCount     = 0

  for (const ev of weekEvents) {
    const cat = getCategory(ev, members)
    if (cat === 'kid') {
      const m = members.find((x) => x.id === ev.member_id)
      const name = m?.name.split(' ')[0] ?? 'child'
      kidCounts[name] = (kidCounts[name] ?? 0) + 1
    } else if (cat === 'family') {
      familyCount++
    } else if (cat === 'home') {
      homeCount++
    } else if (cat === 'us') {
      usCount++
    }
  }
  for (const [name, count] of Object.entries(kidCounts)) {
    weekRows.push({ label: name, color: CAT.kid.dot, count })
  }
  if (familyCount > 0) weekRows.push({ label: 'family', color: CAT.family.dot, count: familyCount })
  if (homeCount   > 0) weekRows.push({ label: 'home',   color: CAT.home.dot,   count: homeCount })
  if (usCount     > 0) weekRows.push({ label: 'us',     color: CAT.us.dot,     count: usCount })

  // "coming up" — next 2 occasions
  const upcoming = occasions
    .filter((o) => o.date >= toStr(new Date()))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)

  return (
    <div style={{ padding: '22px 20px', borderLeft: '0.5px solid #E8E4DC', overflowY: 'auto' }}>

      {/* this week */}
      {weekRows.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: '#B4B2A9', marginBottom: 10 }}>
            this week
          </p>
          {weekRows.map((row) => (
            <div key={row.label} className="flex items-center" style={{ marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: row.color, display: 'inline-block', marginRight: 8, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#1A1A18', flex: 1 }}>{row.label}</span>
              <span style={{ fontSize: 11, color: '#B4B2A9' }}>{row.count} event{row.count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* for you (demo: hardcoded; live: omit for now) */}
      {isDemo && (
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: '#B4B2A9', marginBottom: 10 }}>
            for you
          </p>
          {DEMO_FOR_YOU.map((item) => (
            <div key={item.title} style={{ background: '#fff', border: '0.5px solid #E8E4DC', borderRadius: 9, padding: '10px 12px', marginBottom: 7 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#1A1A18' }}>{item.title}</p>
              <p style={{ fontSize: 11, color: '#B4B2A9', marginTop: 2, lineHeight: 1.4 }}>{item.subtitle}</p>
              <span
                className="inline-flex items-center gap-1"
                style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 10, padding: '4px 9px', borderRadius: 5, marginTop: 6 }}
              >
                <IconSparkles size={10} />
                {item.agentLine}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* coming up */}
      {upcoming.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: '#B4B2A9', marginBottom: 10 }}>
            coming up
          </p>
          {upcoming.map((occ) => (
            <div key={occ.id} style={{ background: '#fff', border: '0.5px solid #E8E4DC', borderRadius: 9, padding: '10px 12px', marginBottom: 7 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#1A1A18' }}>{occ.label}</p>
              <p style={{ fontSize: 11, color: '#B4B2A9', marginTop: 2 }}>{occasionLabel(occ.date)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function CalendarScreen() {
  const familyId = useAuthStore((s) => s.familyId)
  const isDemo   = useAuthStore((s) => s.isDemo)

  const [ws,           setWs]           = useState(() => weekStart(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => toStr(new Date()))
  const [allEvents,    setAllEvents]    = useState<FamilyEvent[]>([])
  const [members,      setMembers]      = useState<Member[]>([])
  const [occasions,    setOccasions]    = useState<Occasion[]>([])
  const [loading,      setLoading]      = useState(true)
  const [currentEvId,  setCurrentEvId]  = useState<string | null>(null)

  const days     = weekDays(ws)
  const listRef  = useRef<HTMLDivElement>(null)
  const groupRefs = useRef<Record<string, HTMLDivElement>>({})

  // ── Load data ────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!familyId) return
    setLoading(true)
    try {
      const evQuery = isDemo
        ? supabase.from('events').select('*').eq('family_id', familyId).order('time_start')
        : supabase.from('events').select('*').eq('family_id', familyId)
            .gte('date', toStr(days[0])).lte('date', toStr(days[6])).order('time_start')

      const [evRes, memRes, occRes] = await Promise.all([
        evQuery,
        supabase.from('members').select('*').eq('family_id', familyId),
        supabase.from('occasions').select('*').eq('family_id', familyId).order('date'),
      ])
      setAllEvents((evRes.data  as FamilyEvent[]) ?? [])
      setMembers((memRes.data   as Member[])      ?? [])
      setOccasions((occRes.data as Occasion[])    ?? [])
    } finally {
      setLoading(false)
    }
  }, [familyId, ws]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void loadData() }, [loadData])

  // ── Current event — refresh every minute ─────────────────────────────────────
  useEffect(() => {
    setCurrentEvId(getNextEventId(allEvents))
    const id = setInterval(() => setCurrentEvId(getNextEventId(allEvents)), 60_000)
    return () => clearInterval(id)
  }, [allEvents])

  // ── Week events (filter allEvents to current week) ──────────────────────────
  const weekEvs = allEvents.filter((e) => {
    return e.date >= toStr(days[0]) && e.date <= toStr(days[6])
  })

  // ── Dot map for CalendarHeader ───────────────────────────────────────────────
  const dotMap: Record<string, Category[]> = {}
  for (const ev of weekEvs) {
    const cat = getCategory(ev, members)
    if (!dotMap[ev.date]) dotMap[ev.date] = []
    if (!dotMap[ev.date].includes(cat)) dotMap[ev.date].push(cat)
  }

  // ── Day click → scroll to group ──────────────────────────────────────────────
  function handleDaySelect(ds: string) {
    setSelectedDate(ds)
    const el = groupRefs.current[ds]
    if (el && listRef.current) {
      listRef.current.scrollTo({ top: el.offsetTop - 22, behavior: 'smooth' })
    }
  }

  // ── Scroll → update selected day ────────────────────────────────────────────
  function handleScroll() {
    if (!listRef.current) return
    const scrollTop = listRef.current.scrollTop + 40
    let best: string | null = null
    for (const [ds, el] of Object.entries(groupRefs.current)) {
      if (el.offsetTop <= scrollTop) best = ds
    }
    if (best && best !== selectedDate) setSelectedDate(best)
  }

  // ── Week navigation ──────────────────────────────────────────────────────────
  function goToday() {
    const today = new Date()
    setWs(weekStart(today))
    setSelectedDate(toStr(today))
  }

  // Snap selected date when navigating weeks
  useEffect(() => {
    const weekStrs = weekDays(ws).map(toStr)
    if (!weekStrs.includes(selectedDate)) setSelectedDate(toStr(ws))
  }, [ws]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

      {/* KinlyBar — above the week strip */}
      <KinlyBar
        page="calendar"
        context={{
          memberNames: members.map((m) => m.name.split(' ')[0]),
          todayEvents: allEvents
            .filter((e) => e.date === toStr(new Date()))
            .map((e) => ({ title: e.title, time: e.time_start })),
        }}
      />

      {/* Dark week strip */}
      <CalendarHeader
        selectedDate={selectedDate}
        weekDaysList={days}
        dotMap={dotMap}
        onDaySelect={handleDaySelect}
        onPrev={() => setWs((w) => weekStart(subWeeks(w, 1)))}
        onNext={() => setWs((w) => weekStart(addWeeks(w, 1)))}
        onToday={goToday}
      />

      {/* Body grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 268px', flex: 1, overflow: 'hidden' }}>

        {/* EventList */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          style={{ overflowY: 'auto', padding: '22px 28px 40px', borderRight: '0.5px solid #E8E4DC', background: '#FFFFFF' }}
        >
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-[10px]" style={{ height: 56, background: '#F0EFED' }} />
              ))}
            </div>
          ) : days.every((d) => (weekEvs.filter((e) => e.date === toStr(d))).length === 0) ? (
            <p style={{ fontSize: 13, color: '#B4B2A9', paddingTop: 8 }}>
              No events this week.
            </p>
          ) : (
            days.map((day) => {
              const ds   = toStr(day)
              const evs  = weekEvs.filter((e) => e.date === ds)
              return (
                <DayGroup
                  key={ds}
                  date={day}
                  events={evs}
                  members={members}
                  currentEventId={currentEvId}
                  groupRef={(el) => {
                    if (el) groupRefs.current[ds] = el
                    else delete groupRefs.current[ds]
                  }}
                />
              )
            })
          )}
        </div>

        {/* SidePanel */}
        <SidePanel
          weekEvents={weekEvs}
          members={members}
          occasions={occasions}
          isDemo={isDemo}
        />
      </div>

    </div>
  )
}
