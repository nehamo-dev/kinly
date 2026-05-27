interface SectionHeaderProps {
  label: string
  count?: number
  action?: { label: string; onClick: () => void }
}

export function SectionHeader({ label, count, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[#E8392A] text-sm leading-none" aria-hidden>●</span>
        <span className="text-xs font-semibold tracking-widest uppercase text-[#E8392A]">
          {label}
          {count !== undefined && <span className="ml-1.5">{count}</span>}
        </span>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs text-slate-400 hover:text-[#E8392A] transition-colors"
        >
          {action.label} →
        </button>
      )}
    </div>
  )
}
