interface ComingUpCardProps {
  label: string      // "Sarah & James Anniversary"
  dateLabel: string  // "Sat · Jun 7" or "in 3 weeks"
  sublabel?: string  // optional hint
}

export function ComingUpCard({ label, dateLabel, sublabel }: ComingUpCardProps) {
  return (
    <div
      className="rounded-[10px] px-3.5 py-2.5"
      style={{
        background: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="text-[12px] font-medium leading-snug flex-1"
          style={{ color: '#1A1A18' }}
        >
          {label}
        </span>
        <span
          className="text-[11px] flex-shrink-0 whitespace-nowrap pt-px"
          style={{ color: '#B4B2A9' }}
        >
          {dateLabel}
        </span>
      </div>
      {sublabel && (
        <p className="text-[11px] mt-0.5" style={{ color: '#B4B2A9' }}>
          {sublabel}
        </p>
      )}
    </div>
  )
}
