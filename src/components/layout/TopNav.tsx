import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/', label: 'today' },
  { to: '/family', label: 'family' },
  { to: '/calendar', label: 'calendar' },
  { to: '/home', label: 'home' },
  { to: '/inbox', label: 'inbox' },
]

export function TopNav() {
  const user = useAuthStore((s) => s.user)
  const initials = getInitials(user?.user_metadata?.full_name || user?.email || 'Y')

  return (
    <header className="sticky top-0 z-40 bg-k-nav w-full" style={{ height: '52px' }}>
      <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center gap-6">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 flex-shrink-0">
          <KinlyLogo />
          <span className="text-[15px] font-semibold tracking-tight text-k-on-dark">kinly</span>
        </NavLink>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 flex-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors duration-100 ` +
                (isActive
                  ? 'bg-k-nav-pill text-k-on-dark'
                  : 'text-k-dim hover:text-k-on-dark')
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-3">
          {/* Bell */}
          <button className="relative text-k-dim hover:text-k-on-dark transition-colors p-1" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>

          {/* Avatar */}
          <button
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 transition-opacity hover:opacity-80"
            style={{ background: '#3a3a38', color: '#B4B2A9' }}
            aria-label="Account"
          >
            {initials}
          </button>
        </div>
      </div>
    </header>
  )
}

function KinlyLogo() {
  return (
    <svg width="24" height="22" viewBox="0 0 60 54" fill="none" className="flex-shrink-0">
      <circle cx="30" cy="10" r="6" fill="#EF9F27" />
      <circle cx="14" cy="26" r="6" fill="#EF9F27" />
      <circle cx="46" cy="26" r="6" fill="#EF9F27" />
      <path d="M8 38 Q30 56 52 38" stroke="#EF9F27" strokeWidth="5.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function getInitials(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.[0] ?? 'Y').toUpperCase()
}
