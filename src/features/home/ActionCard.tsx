import { IconSparkles } from '@tabler/icons-react'

export type PillVariant = 'urgent' | 'overdue' | 'neutral'

const PILL_STYLES: Record<PillVariant, { bg: string; color: string }> = {
  urgent:  { bg: '#FAC775', color: '#633806' },
  overdue: { bg: '#F5C4B3', color: '#712B13' },
  neutral: { bg: '#EDE9E2', color: '#5F5E5A' },
}

interface ActionCardProps {
  title: string
  subtitle?: string
  timePill: { label: string; variant: PillVariant }
  agentLine?: string
  agentAction?: { label: string; onClick: () => void }
  isHandled?: boolean
}

export function ActionCard({
  title,
  subtitle,
  timePill,
  agentLine,
  agentAction,
  isHandled,
}: ActionCardProps) {
  const pill = PILL_STYLES[timePill.variant]

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '0.5px solid #E8E4DC',
        borderRadius: 12,
        padding: '14px 16px',
        opacity: isHandled ? 0.4 : 1,
        transition: 'opacity 200ms',
      }}
    >
      {/* Row 1: title + pill */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A18', lineHeight: 1.35, flex: 1 }}>
          {title}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            background: pill.bg,
            color: pill.color,
            borderRadius: 5,
            padding: '2px 7px',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            marginTop: 1,
          }}
        >
          {timePill.label}
        </span>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p style={{ fontSize: 11, color: '#888780', marginTop: 4, lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}

      {/* Kinly action button */}
      {agentLine && !isHandled && (
        <button
          onClick={(e) => { e.stopPropagation(); agentAction?.onClick() }}
          style={{
            marginTop: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 500,
            color: '#1A1A18',
            background: '#FFFFFF',
            border: '0.5px solid #D3D1C7',
            borderRadius: 8,
            padding: '5px 10px',
            cursor: 'pointer',
            transition: 'background 120ms',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAF8')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
        >
          <IconSparkles size={11} color="#888780" />
          {agentLine}
        </button>
      )}
    </div>
  )
}
