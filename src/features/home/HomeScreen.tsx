// ─── Home screen (/home) ──────────────────────────────────────────────────────
// Household services, maintenance schedule, and shopping lists.
// Reads from Supabase for both demo and real users.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  differenceInDays,
  parseISO,
  format,
  isBefore,
  startOfDay,
} from 'date-fns'
import {
  IconSparkles,
  IconCheck,
} from '@tabler/icons-react'
import { KinlyBar } from '../../components/shared/KinlyBar'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import type { HomeService, ShoppingList, ShoppingItem } from '../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const FREQ_LABEL: Record<string, string> = {
  weekly:    'Weekly',
  biweekly:  'Every 2 weeks',
  monthly:   'Monthly',
  quarterly:  'Quarterly',
  annual:    'Annual',
  custom:    'Custom',
}

function serviceStatus(svc: HomeService): {
  label: string
  variant: 'overdue' | 'soon' | 'ok'
  daysText: string
} {
  const today = startOfDay(new Date())
  if (!svc.next_due) {
    return { label: 'Not scheduled', variant: 'ok', daysText: '' }
  }
  const due = parseISO(svc.next_due)
  const days = differenceInDays(due, today)

  if (isBefore(due, today)) {
    const overdue = Math.abs(days)
    return {
      label: 'Overdue',
      variant: 'overdue',
      daysText: `${overdue} day${overdue !== 1 ? 's' : ''} overdue`,
    }
  }
  if (days <= 7) {
    return {
      label: 'Due soon',
      variant: 'soon',
      daysText: days === 0 ? 'Due today' : `Due in ${days}d`,
    }
  }
  return {
    label: 'Scheduled',
    variant: 'ok',
    daysText: `Due ${format(due, 'MMM d')}`,
  }
}

// ── Service card ──────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  overdue: { bg: '#F5C4B3', text: '#712B13', dot: '#E8392A' },
  soon:    { bg: '#FAC775', text: '#633806', dot: '#EF9F27' },
  ok:      { bg: '#E1F5EE', text: '#085041', dot: '#5DCAA5' },
}

function ServiceCard({
  service,
  onKinlyHandle,
}: {
  service: HomeService
  onKinlyHandle?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const status = serviceStatus(service)
  const colors = STATUS_COLORS[status.variant]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#FAFAF8' : '#ffffff',
        border: '0.5px solid #E8E4DC',
        borderRadius: 12,
        padding: '14px 16px',
        transition: 'background 150ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: colors.dot,
                flexShrink: 0,
              }}
            />
            <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1A18' }}>{service.name}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingLeft: 15 }}>
            <span style={{ fontSize: 11, color: '#B4B2A9' }}>
              {FREQ_LABEL[service.frequency] ?? service.frequency}
            </span>
            {service.last_done && (
              <>
                <span style={{ fontSize: 11, color: '#E8E4DC' }}>·</span>
                <span style={{ fontSize: 11, color: '#B4B2A9' }}>
                  Last: {format(parseISO(service.last_done), 'MMM d')}
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              background: colors.bg,
              color: colors.text,
              borderRadius: 5,
              padding: '2px 7px',
              whiteSpace: 'nowrap',
            }}
          >
            {status.daysText || status.label}
          </span>
          {status.variant === 'overdue' && onKinlyHandle && (
            <button
              onClick={onKinlyHandle}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 500,
                color: '#534AB7',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              <IconSparkles size={11} />
              Ask Kinly
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Shopping list ─────────────────────────────────────────────────────────────

function ShoppingListCard({
  list,
  items,
  onToggle,
}: {
  list: ShoppingList
  items: ShoppingItem[]
  onToggle: (itemId: string, checked: boolean) => void
}) {
  const done = items.filter((i) => i.checked).length
  const total = items.length

  return (
    <div
      style={{
        background: '#ffffff',
        border: '0.5px solid #E8E4DC',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '0.5px solid #F3F0EA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 500, color: '#1A1A18' }}>{list.name}</p>
        <span style={{ fontSize: 11, color: '#B4B2A9' }}>
          {done}/{total}
        </span>
      </div>

      {/* Items */}
      <div>
        {items.map((item, idx) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              borderBottom: idx < items.length - 1 ? '0.5px solid #F3F0EA' : 'none',
              cursor: 'pointer',
            }}
            onClick={() => onToggle(item.id, !item.checked)}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                border: item.checked ? 'none' : '1.5px solid #D3D1C7',
                background: item.checked ? '#5DCAA5' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 150ms',
              }}
            >
              {item.checked && <IconCheck size={11} color="#ffffff" strokeWidth={3} />}
            </div>
            <span
              style={{
                fontSize: 13,
                color: item.checked ? '#B4B2A9' : '#1A1A18',
                textDecoration: item.checked ? 'line-through' : 'none',
                flex: 1,
              }}
            >
              {item.name}
            </span>
            {item.quantity && (
              <span style={{ fontSize: 11, color: '#B4B2A9', flexShrink: 0 }}>
                {item.quantity}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div
      style={{
        height: 72,
        borderRadius: 12,
        background: '#EFEFED',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 9,
        color: '#bbbbbb',
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        fontWeight: 500,
        marginBottom: 10,
      }}
    >
      {children}
    </p>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function HomeScreen() {
  const familyId = useAuthStore((s) => s.familyId)

  const [services,       setServices]       = useState<HomeService[]>([])
  const [shoppingLists,  setShoppingLists]  = useState<ShoppingList[]>([])
  const [shoppingItems,  setShoppingItems]  = useState<ShoppingItem[]>([])
  const [loading,        setLoading]        = useState(true)

  const kinlyPrefillRef = useRef<((t: string) => void) | null>(null)

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!familyId) return
    setLoading(true)
    try {
      const [svcRes, listRes] = await Promise.all([
        supabase.from('home_services').select('*').eq('family_id', familyId),
        supabase.from('shopping_lists').select('*').eq('family_id', familyId),
      ])
      const svcs  = (svcRes.data  as HomeService[])  ?? []
      const lists = (listRes.data as ShoppingList[]) ?? []
      setServices(svcs)
      setShoppingLists(lists)

      if (lists.length > 0) {
        const listIds = lists.map((l) => l.id)
        const { data: itemData } = await supabase
          .from('shopping_items')
          .select('*')
          .in('list_id', listIds)
          .order('checked', { ascending: true })
        setShoppingItems((itemData as ShoppingItem[]) ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => { void loadData() }, [loadData])

  // ── Toggle shopping item ──────────────────────────────────────────────────
  async function toggleItem(itemId: string, checked: boolean) {
    setShoppingItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, checked } : i)),
    )
    await supabase.from('shopping_items').update({ checked }).eq('id', itemId)
  }

  // ── Kinly prefill for overdue services ───────────────────────────────────
  function handleKinlyForService(svcName: string) {
    kinlyPrefillRef.current?.(
      `${svcName} is overdue — what should I do?`,
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 52px)', paddingBottom: 80,
        background: '#ffffff',
      }}
    >
      {/* KinlyBar */}
      <KinlyBar
        page="home"
        context={{ memberNames: [] }}
        prefillRef={kinlyPrefillRef}
        onActionExecuted={() => { void loadData() }}
      />

      {/* Page header */}
      <div style={{ maxWidth: 760, margin: '0 auto', width: '100%', padding: '22px 20px 0' }}>
        <h1
          style={{
            fontFamily: 'Lora, serif',
            fontSize: 22,
            fontWeight: 400,
            color: '#1a1a1a',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          Your home.
        </h1>
        <p style={{ fontSize: 12, color: '#b4b2a9', marginTop: 4, marginBottom: 20 }}>
          Services, maintenance and shopping.
        </p>
      </div>

      {/* Content */}
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          width: '100%',
          padding: '0 20px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {/* Services */}
        <section>
          <SectionLabel>Services</SectionLabel>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : services.length === 0 ? (
            <EmptySection message="No services tracked yet. Tell Kinly about your cleaning schedule, HVAC, or any recurring service." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {services.map((svc) => {
                const status = serviceStatus(svc)
                return (
                  <ServiceCard
                    key={svc.id}
                    service={svc}
                    onKinlyHandle={
                      status.variant === 'overdue'
                        ? () => handleKinlyForService(svc.name)
                        : undefined
                    }
                  />
                )
              })}
            </div>
          )}
        </section>

        {/* Shopping */}
        {(loading || shoppingLists.length > 0) && (
          <section>
            <SectionLabel>Shopping</SectionLabel>
            {loading ? (
              <CardSkeleton />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {shoppingLists.map((list) => (
                  <ShoppingListCard
                    key={list.id}
                    list={list}
                    items={shoppingItems.filter((i) => i.list_id === list.id)}
                    onToggle={toggleItem}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

// ── Empty section ─────────────────────────────────────────────────────────────

function EmptySection({ message }: { message: string }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '0.5px solid #E8E4DC',
        borderRadius: 12,
        padding: '24px 20px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 13, color: '#B4B2A9', lineHeight: 1.6 }}>{message}</p>
    </div>
  )
}

