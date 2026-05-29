export type PillVariant = 'urgent' | 'overdue' | 'neutral'

// Matches spec: .b-critical / .b-today / .b-date
const PILL_STYLES: Record<PillVariant, { bg: string; color: string }> = {
  overdue: { bg: '#fdf0ee', color: '#c0422a' },
  urgent:  { bg: '#fdf6ec', color: '#b07020' },
  neutral: { bg: '#f2f2f2', color: '#888888' },
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
        background:   '#ffffff',
        border:       '0.5px solid #ebebeb',
        borderRadius: 10,
        padding:      '12px 14px',
        display:      'grid',
        gridTemplateColumns: '1fr auto',
        gap:          6,
        alignItems:   'start',
        opacity:      isHandled ? 0.4 : 1,
      }}
    >
      {/* Left: title + meta + action button */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', marginBottom: 2 }}>
          {title}
        </p>
        {subtitle && (
          <p style={{ fontSize: 10, color: '#b0b0b0', lineHeight: 1.4 }}>
            {subtitle}
          </p>
        )}
        {agentLine && !isHandled && (
          <button
            onClick={(e) => { e.stopPropagation(); agentAction?.onClick() }}
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:           3,
              marginTop:     6,
              fontSize:      9,
              fontWeight:    500,
              color:        '#7a5c20',
              background:   '#faecd0',
              border:       'none',
              borderRadius:  4,
              padding:      '2px 7px',
              cursor:       'pointer',
              fontFamily:   'inherit',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {agentLine}
          </button>
        )}
      </div>

      {/* Right: badge */}
      <span
        style={{
          fontSize:     9,
          fontWeight:    500,
          background:   pill.bg,
          color:        pill.color,
          borderRadius:  4,
          padding:      '2px 7px',
          whiteSpace:   'nowrap',
        }}
      >
        {timePill.label}
      </span>
    </div>
  )
}
