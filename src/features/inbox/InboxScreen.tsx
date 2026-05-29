// ─── Inbox screen ─────────────────────────────────────────────────────────────
// Demo mode: renders DEMO_EMAILS flagged by Kinly.
// Real mode: empty state (gmail integration not yet wired).
// KinlyBar at top for compose/reply assistance.

import { useState } from 'react'
import { IconMail, IconSparkles, IconPlus } from '@tabler/icons-react'
import { KinlyBar } from '../../components/shared/KinlyBar'
import { useAuthStore } from '../../store/authStore'
import { DEMO_EMAILS } from '../../lib/demo'
import type { DemoFlaggedEmail } from '../../types'

// ── Tag styles ────────────────────────────────────────────────────────────────

const TAG_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  urgent:   { bg: '#F5C4B3', color: '#712B13', label: 'urgent' },
  kid:      { bg: '#EEEDFE', color: '#534AB7', label: 'kid' },
  home:     { bg: '#E1F5EE', color: '#085041', label: 'home' },
  occasion: { bg: '#FBEAF0', color: '#993556', label: 'occasion' },
  shopping: { bg: '#EDE9E2', color: '#5F5E5A', label: 'shopping' },
}

// ── EmailCard ─────────────────────────────────────────────────────────────────

function EmailCard({
  email,
  onAddTask,
  added,
}: {
  email: DemoFlaggedEmail
  onAddTask: (id: string) => void
  added: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const tag = email.tag ? TAG_STYLE[email.tag] : null

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
        opacity: added ? 0.5 : 1,
      }}
    >
      {/* Top row: domain + timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#888780',
            background: '#F3F0EA',
            borderRadius: 5,
            padding: '2px 7px',
          }}
        >
          {email.domain}
        </span>
        <span style={{ fontSize: 11, color: '#B4B2A9' }}>{email.timestamp}</span>
      </div>

      {/* Subject */}
      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: '#1A1A18',
          lineHeight: 1.35,
          marginBottom: 4,
        }}
      >
        {email.title}
      </p>

      {/* Preview */}
      <p
        style={{
          fontSize: 12,
          color: '#888780',
          lineHeight: 1.5,
          marginBottom: 10,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {email.preview}
      </p>

      {/* Bottom row: pills + action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {tag && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              background: tag.bg,
              color: tag.color,
              borderRadius: 5,
              padding: '2px 7px',
            }}
          >
            {tag.label}
          </span>
        )}
        {email.memberName && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              background: '#EEEDFE',
              color: '#534AB7',
              borderRadius: 5,
              padding: '2px 7px',
            }}
          >
            {email.memberName}
          </span>
        )}

        <div style={{ flex: 1 }} />

        {added ? (
          <span style={{ fontSize: 11, color: '#1D9E75' }}>Added ✓</span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onAddTask(email.id) }}
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
              padding: '3px 0',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <IconPlus size={12} />
            Add as task
          </button>
        )}
      </div>
    </div>
  )
}

// ── Empty state (real users) ──────────────────────────────────────────────────

function EmptyInbox() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        gap: 12,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: '#F3F0EA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconMail size={20} color="#C4C2BA" />
      </div>
      <p style={{ fontSize: 15, fontWeight: 500, color: '#1A1A18' }}>No flagged emails yet</p>
      <p style={{ fontSize: 13, color: '#B4B2A9', lineHeight: 1.6, maxWidth: 300 }}>
        Once you connect Gmail, Kinly will flag emails from your family's schools,
        providers, and clubs here.
      </p>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#EEEDFE',
          color: '#534AB7',
          fontSize: 12,
          fontWeight: 500,
          borderRadius: 8,
          padding: '8px 14px',
          marginTop: 4,
          cursor: 'default',
        }}
      >
        <IconSparkles size={13} />
        Coming soon — Gmail integration
      </div>
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function InboxScreen() {
  const isDemo   = useAuthStore((s) => s.isDemo)

  const emails: DemoFlaggedEmail[] = isDemo ? DEMO_EMAILS : []
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  function handleAddTask(emailId: string) {
    setAddedIds((prev) => new Set([...prev, emailId]))
    // TODO: insert task into Supabase when backend is wired
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 52px)',
        background: '#F7F4EF',
      }}
    >
      {/* KinlyBar */}
      <KinlyBar
        page="inbox"
        context={{ memberNames: [] }}
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
          Your inbox
        </h1>
        <p style={{ fontSize: 12, color: '#B4B2A9', marginTop: 3, marginBottom: 20 }}>
          {isDemo
            ? 'Emails Kinly flagged as relevant to your family.'
            : 'Emails Kinly thinks matter to your family.'}
        </p>
      </div>

      {/* Content */}
      <div style={{ padding: '0 28px 28px', maxWidth: 680 }}>
        {emails.length === 0 ? (
          <EmptyInbox />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {emails.map((email) => (
              <EmailCard
                key={email.id}
                email={email}
                onAddTask={handleAddTask}
                added={addedIds.has(email.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
