// ─── Family page ──────────────────────────────────────────────────────────────
// Member roster grid driven by KinlyBar conversational input.
// Spec: kinly-family-spec.md + kinly-bar-spec.md

import { useCallback, useEffect, useRef, useState } from 'react'
import { differenceInYears, parseISO, format } from 'date-fns'
import {
  IconDots,
  IconSparkles,
  IconSchool,
  IconCake,
} from '@tabler/icons-react'
import { KinlyBar } from '../../components/shared/KinlyBar'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { parseMember } from '../../lib/parseMember'
import type { Member } from '../../types'

// ── Role → colour mapping ─────────────────────────────────────────────────────

const ROLE_COLOR: Record<FamilyRole, string> = {
  owner:       '#EF9F27',
  partner:     '#5DCAA5',
  child:       '#AFA9EC',
  grandparent: '#ED93B1',
  other:       '#ED93B1',
}

const ROLE_LABEL: Record<FamilyRole, string> = {
  owner:       'Account owner',
  partner:     'Partner',
  child:       'Child',
  grandparent: 'Grandparent',
  other:       'Family member',
}

type FamilyRole = 'owner' | 'partner' | 'child' | 'grandparent' | 'other'

// ── Local FamilyMember shape ──────────────────────────────────────────────────

interface FamilyMember {
  id: string
  name: string
  role: FamilyRole
  color: string
  initials: string
  fields: { icon: React.ReactNode; value: string }[]
  isNew?: boolean
}

// ── Map DB Member → FamilyMember ──────────────────────────────────────────────

function toFamilyMember(m: Member, isFirst: boolean): FamilyMember {
  const role: FamilyRole =
    m.role === 'child'    ? 'child'
    : isFirst             ? 'owner'
    : m.role === 'parent' ? 'partner'
    : 'other'

  const color    = m.avatar_color ?? ROLE_COLOR[role]
  const parts    = m.name.trim().split(/\s+/)
  const initials = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')

  const fields: { icon: React.ReactNode; value: string }[] = []

  if (m.school) {
    fields.push({
      icon: <IconSchool size={12} color="#C4C2BA" />,
      value: m.grade ? `${m.school} · ${m.grade}` : m.school,
    })
  }

  if (m.date_of_birth) {
    const age = differenceInYears(new Date(), parseISO(m.date_of_birth))
    if (age > 0 && age < 120) {
      fields.push({
        icon: <IconCake size={12} color="#C4C2BA" />,
        value: `${age} years old`,
      })
    }
  }

  return {
    id:       m.id,
    name:     m.name,
    role,
    color,
    initials: initials.toUpperCase(),
    fields,
  }
}

// ── Extraction panel (shown inside Kinly bubble) ──────────────────────────────

interface ExtractionData {
  name?: string
  role?: string
  age?: string
  school?: string
  grade?: string
  notes?: string
}

function ExtractionDisplay({ data }: { data: ExtractionData }) {
  const rows = [
    data.name   && { key: 'name',   val: data.name },
    data.role   && { key: 'role',   val: data.role },
    data.age    && { key: 'age',    val: data.age },
    data.school && { key: 'school', val: data.school },
    data.grade  && { key: 'grade',  val: data.grade },
    data.notes  && { key: 'notes',  val: data.notes },
  ].filter(Boolean) as { key: string; val: string }[]

  if (!rows.length) return null

  return (
    <div
      style={{
        background: '#EEEDFE',
        borderRadius: 7,
        padding: '8px 10px',
        marginTop: 7,
      }}
    >
      <p
        style={{
          fontSize: 9,
          fontWeight: 500,
          color: '#534AB7',
          letterSpacing: '0.05em',
          marginBottom: 5,
          textTransform: 'uppercase',
        }}
      >
        Extracted
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {rows.map(({ key, val }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: '#AFA9EC',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 10, color: '#8B82D4', minWidth: 52 }}>{key}</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: '#3C3489' }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Dots menu ─────────────────────────────────────────────────────────────────

function DotsMenu({
  name,
  onEdit,
  onRemove,
}: {
  name: string
  onEdit: () => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 4px',
          lineHeight: 0,
          borderRadius: 4,
        }}
      >
        <IconDots size={15} color="#D3D1C7" />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '0.5px solid #E8E4DC',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            zIndex: 50,
            minWidth: 130,
            overflow: 'hidden',
          }}
        >
          {[
            { label: `Edit ${name}`, action: onEdit },
            { label: 'Remove member', action: onRemove },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={() => { setOpen(false); action() }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '9px 13px',
                fontSize: 12,
                color: '#1A1A18',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F7F4EF')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MemberCard ────────────────────────────────────────────────────────────────

function MemberCard({
  member,
  onEdit,
  onRemove,
}: {
  member: FamilyMember
  onEdit: () => void
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isNew = member.isNew

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#FAFAF8' : '#ffffff',
        border: isNew
          ? `1.5px solid ${member.color}`
          : '0.5px solid #E8E4DC',
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'background 150ms, border 400ms',
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: member.color }} />

      {/* Card top section */}
      <div
        style={{
          padding: '14px 14px 10px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Avatar */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: member.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
            }}
          >
            {member.initials || member.name[0]?.toUpperCase()}
          </div>
          {/* Name */}
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#1A1A18',
              marginTop: 8,
              lineHeight: 1.2,
            }}
          >
            {member.name}
          </p>
          {/* Role */}
          <p style={{ fontSize: 11, color: '#B4B2A9', marginTop: 1 }}>
            {ROLE_LABEL[member.role]}
          </p>
        </div>

        {/* Dots menu */}
        <DotsMenu
          name={member.name.split(' ')[0]}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      </div>

      {/* Fields section */}
      {member.fields.length > 0 && (
        <div
          style={{
            borderTop: '0.5px solid #F3F0EA',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {member.fields.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ flexShrink: 0, lineHeight: 0 }}>{f.icon}</span>
              <span style={{ fontSize: 11, color: '#1A1A18', lineHeight: 1.4 }}>{f.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── AddCard ───────────────────────────────────────────────────────────────────

function AddCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#F3F1EC' : '#FAFAF8',
        border: '1px dashed #D3D1C7',
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        gap: 6,
        cursor: 'pointer',
        minHeight: 140,
        transition: 'background 150ms',
      }}
    >
      <IconSparkles size={20} color="#C4C2BA" />
      <span
        style={{
          fontSize: 11,
          color: '#C4C2BA',
          textAlign: 'center',
          lineHeight: 1.5,
        }}
      >
        Tell Kinly about<br />someone new
      </span>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

const EXAMPLE_CHIPS = [
  "My daughter Lila is 8, she goes to Cedar Crest",
  "My partner Jake works at Amazon",
  "Add my mum, she helps with pickup",
]

function EmptyState({ onChipClick }: { onChipClick: (text: string) => void }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '0.5px solid #E8E4DC',
        borderRadius: 14,
        padding: '28px 24px',
        maxWidth: 420,
      }}
    >
      <p style={{ fontSize: 15, fontWeight: 500, color: '#1A1A18', marginBottom: 8 }}>
        Start with your family
      </p>
      <p
        style={{
          fontSize: 13,
          color: '#888780',
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        Just tell Kinly who's in your family — names, ages, schools, jobs. No forms.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {EXAMPLE_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => onChipClick(chip)}
            style={{
              background: '#EEEDFE',
              color: '#534AB7',
              fontSize: 12,
              borderRadius: 20,
              padding: '6px 14px',
              border: 'none',
              cursor: 'pointer',
              lineHeight: 1.4,
              transition: 'opacity 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function Family() {
  const familyId = useAuthStore((s) => s.familyId)

  const [members,  setMembers]  = useState<FamilyMember[]>([])
  const [loading,  setLoading]  = useState(true)
  const [newIds,   setNewIds]   = useState<Set<string>>(new Set())

  // Ref to KinlyBar focus function (for AddCard click)
  const kinlyFocusRef  = useRef<(() => void) | null>(null)
  // Ref to KinlyBar prefill function (for dots-menu Edit / Remove)
  const kinlyPrefillRef = useRef<((text: string) => void) | null>(null)

  // ── Load members ─────────────────────────────────────────────────────────
  const loadMembers = useCallback(async () => {
    if (!familyId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('members')
        .select('*')
        .eq('family_id', familyId)
        .order('role')
      const rows = (data as Member[]) ?? []
      let firstParent = true
      const mapped = rows.map((m) => {
        const isFirst = m.role === 'parent' && firstParent
        if (m.role === 'parent') firstParent = false
        return toFamilyMember(m, isFirst)
      })
      setMembers(mapped)
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => { void loadMembers() }, [loadMembers])

  // ── Mark a card as "just added" for 4s ───────────────────────────────────
  function markNew(id: string) {
    setNewIds((prev) => new Set([...prev, id]))
    setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 4000)
  }

  // ── KinlyBar: handle family messages (extraction + member add) ────────────
  async function handleKinlyMessage(text: string): Promise<React.ReactNode | null> {
    if (!familyId) return null
    const parsed = parseMember(text)
    if (!parsed.name) return null   // nothing extractable — let Groq handle it normally

    // Derive approximate date_of_birth from age
    const dob = parsed.age
      ? format(new Date(new Date().getFullYear() - parsed.age, 6, 1), 'yyyy-MM-dd')
      : null

    const color = parsed.role === 'child' ? '#AFA9EC' : '#5DCAA5'

    const { data: inserted } = await supabase
      .from('members')
      .insert({
        family_id:     familyId,
        name:          parsed.name,
        role:          parsed.role === 'child' ? 'child' : 'parent',
        date_of_birth: dob,
        school:        parsed.school ?? null,
        grade:         parsed.grade ?? null,
        avatar_color:  color,
      })
      .select()
      .single()

    if (inserted) {
      const dbMember = inserted as Member
      const isOwner  = false // newly added = never the owner
      const fm       = toFamilyMember(dbMember, isOwner)

      // Animate card in
      setMembers((prev) => [...prev, fm])
      markNew(fm.id)
    }

    const extractData: ExtractionData = {
      name:   parsed.name,
      role:   parsed.role,
      age:    parsed.age ? `${parsed.age}` : undefined,
      school: parsed.school ?? undefined,
      grade:  parsed.grade ?? undefined,
      notes:  parsed.notes ?? undefined,
    }

    return <ExtractionDisplay data={extractData} />
  }

  // ── Prefill KinlyBar input (dots-menu: Edit / Remove) ────────────────────
  function prefillKinly(text: string) {
    kinlyPrefillRef.current?.(text)
  }

  const rosterRef = useRef<HTMLDivElement>(null)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 52px)',
        background: '#F7F4EF',
      }}
    >
      {/* KinlyBar — above all content */}
      <KinlyBar
        page="family"
        context={{ memberNames: members.map((m) => m.name.split(' ')[0]) }}
        contextLabel="Building your family profiles"
        onBeforeQuery={handleKinlyMessage}
        onMountFocus={(fn) => { kinlyFocusRef.current = fn }}
        prefillRef={kinlyPrefillRef}
        onActionExecuted={() => { void loadMembers() }}
      />

      {/* Page header */}
      <div style={{ padding: '22px 28px 0' }}>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: '#1A1A18',
            letterSpacing: '-0.3px',
            margin: 0,
          }}
        >
          Your family
        </h1>
        <p
          style={{
            fontSize: 12,
            color: '#B4B2A9',
            marginTop: 3,
            marginBottom: 20,
          }}
        >
          Tell Kinly about anyone — it fills in the details.
        </p>
      </div>

      {/* Roster */}
      <div
        ref={rosterRef}
        style={{
          padding: '16px 28px 28px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
          alignContent: 'start',
        }}
      >
        {loading ? (
          // Skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 140,
                borderRadius: 14,
                background: '#EFEFED',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))
        ) : members.length === 0 ? (
          // Empty state spans full width
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              onChipClick={(text) => prefillKinly(text)}
            />
          </div>
        ) : (
          <>
            {members.map((m) => (
              <MemberCard
                key={m.id}
                member={{ ...m, isNew: newIds.has(m.id) }}
                onEdit={() => prefillKinly(`Edit ${m.name.split(' ')[0]}...`)}
                onRemove={() => prefillKinly(`Remove ${m.name.split(' ')[0]} from the family`)}
              />
            ))}
            <AddCard onClick={() => kinlyFocusRef.current?.()} />
          </>
        )}
      </div>
    </div>
  )
}
