import { NavLink } from 'react-router-dom'
import { Avatar } from '../ui/Avatar'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/', label: 'Today' },
  { to: '/family', label: 'Family' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/home', label: 'Home' },
  { to: '/inbox', label: 'Inbox' },
]

export function TopNav() {
  const user = useAuthStore((s) => s.user)
  const userName = user?.user_metadata?.full_name || user?.email || 'You'

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100">
      <div className="max-w-[860px] mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2 flex-shrink-0 mr-1">
          <KinlyLogo />
          <span className="font-semibold text-slate-900 text-[15px] tracking-tight">Kinly</span>
        </NavLink>

        {/* Nav */}
        <nav className="flex items-center gap-0.5 flex-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-100
                ${isActive
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User avatar */}
        <Avatar name={userName} size="sm" color="#1c1917" />
      </div>
    </header>
  )
}

function KinlyLogo() {
  return (
    <svg width="26" height="24" viewBox="0 0 60 54" fill="none" className="flex-shrink-0">
      <circle cx="30" cy="10" r="6" fill="#E8392A" />
      <circle cx="14" cy="26" r="6" fill="#E8392A" />
      <circle cx="46" cy="26" r="6" fill="#E8392A" />
      <path d="M8 38 Q30 56 52 38" stroke="#E8392A" strokeWidth="5.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}
