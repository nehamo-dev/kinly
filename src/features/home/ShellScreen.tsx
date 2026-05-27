import { PageWrapper } from '../../components/layout/PageWrapper'
import { EmptyState } from '../../components/ui/EmptyState'

interface ShellScreenProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
}

export function ShellScreen({ title, subtitle, icon }: ShellScreenProps) {
  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <EmptyState
        icon={icon || <ComingSoonIcon />}
        message="This section is coming soon. Check back in the next update."
      />
    </PageWrapper>
  )
}

function ComingSoonIcon() {
  return (
    <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="2" />
      <path d="M24 14v10l6 6" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
