import { Button } from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  message: string
  ctaLabel?: string
  onCta?: () => void
}

export function EmptyState({ icon, message, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      {icon && <div className="text-slate-300 mb-1">{icon}</div>}
      <p className="text-sm text-slate-400 max-w-xs">{message}</p>
      {ctaLabel && onCta && (
        <Button variant="secondary" size="sm" onClick={onCta}>
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}
