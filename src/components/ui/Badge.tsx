type BadgeVariant = 'kid' | 'home' | 'occasion' | 'urgent' | 'gmail' | 'daily' | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  kid: 'bg-sky-100 text-sky-700',
  home: 'bg-amber-100 text-amber-700',
  occasion: 'bg-purple-100 text-purple-700',
  urgent: 'bg-red-100 text-red-700',
  gmail: 'bg-orange-100 text-orange-700',
  daily: 'bg-slate-100 text-slate-600',
  default: 'bg-slate-100 text-slate-600',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}
