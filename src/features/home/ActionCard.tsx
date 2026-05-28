import { useState } from 'react'
import { IconSparkles, IconCheck } from '@tabler/icons-react'

export type CardMember = 'kid' | 'home' | 'shared' | 'couple' | 'urgent'

const BORDER_COLOR: Record<CardMember, string> = {
  kid:    '#AFA9EC',
  home:   '#5DCAA5',
  shared: '#EF9F27',
  couple: '#ED93B1',
  urgent: '#EF9F27',
}

export type PillVariant = 'urgent' | 'overdue' | 'neutral'

const PILL_STYLES: Record<PillVariant, { bg: string; color: string }> = {
  urgent:  { bg: '#FAC775', color: '#633806' },
  overdue: { bg: '#F5C4B3', color: '#712B13' },
  neutral: { bg: '#EDE9E2', color: '#5F5E5A' },
}

interface ActionCardProps {
  title: string
  subtitle: string
  member: CardMember
  timePill: { label: string; variant: PillVariant }
  agentLine?: string
  agentAction?: { label: string; onClick: () => void }
  isHandled?: boolean
  onClick?: () => void
}

export function ActionCard({
  title,
  subtitle,
  member,
  timePill,
  agentLine,
  agentAction,
  isHandled,
  onClick,
}: ActionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const pill = PILL_STYLES[timePill.variant]
  const borderColor = BORDER_COLOR[member]

  return (
    <div
      className="relative rounded-[12px] overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        background: '#FFFFFF',
        borderLeft: `3px solid ${borderColor}`,
        opacity: isHandled ? 0.4 : 1,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
      onClick={() => { setExpanded(!expanded); onClick?.() }}
    >
      <div className="px-3.5 py-3">
        {/* Top row: title + pill */}
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[13px] font-[500] leading-snug flex-1"
            style={{ color: '#1A1A18' }}
          >
            {isHandled && (
              <span className="inline-flex items-center gap-1 text-[11px] font-normal float-right ml-2 mt-0.5" style={{ color: '#B4B2A9' }}>
                <IconCheck size={10} />noted
              </span>
            )}
            {title}
          </span>
          <span
            className="text-[11px] font-medium rounded-full px-2 py-0.5 flex-shrink-0 whitespace-nowrap"
            style={{ background: pill.bg, color: pill.color }}
          >
            {timePill.label}
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-[11px] mt-1 leading-relaxed" style={{ color: '#B4B2A9' }}>
          {subtitle}
        </p>

        {/* Agent line */}
        {agentLine && !isHandled && (
          <div
            className="inline-flex items-center gap-1.5 mt-2 rounded-[6px] px-2 py-1 text-[11px] font-medium"
            style={{ background: '#EEEDFE', color: '#3C3489' }}
          >
            <IconSparkles size={11} />
            {agentLine}
          </div>
        )}

        {/* Expanded CTA */}
        {expanded && agentAction && !isHandled && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F3F0EA' }}>
            <button
              className="text-[12px] font-medium rounded-[8px] px-4 py-2 transition-opacity hover:opacity-80"
              style={{ background: '#1A1A18', color: '#F7F4EF' }}
              onClick={(e) => { e.stopPropagation(); agentAction.onClick() }}
            >
              {agentAction.label}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
