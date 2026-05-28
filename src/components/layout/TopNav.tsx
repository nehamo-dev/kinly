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
        {/* Logo — wordmark + amber dot */}
        <NavLink to="/" className="flex-shrink-0" aria-label="Kinly home">
          <span style={{ fontSize: 18, fontWeight: 500, color: '#F7F4EF', letterSpacing: '-0.4px', lineHeight: 1 }}>
            kinly
            <span style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#EF9F27',
              verticalAlign: 'middle',
              marginLeft: 2,
              marginBottom: 2,
            }} />
          </span>
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


function getInitials(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.[0] ?? 'Y').toUpperCase()
}
