import { NavLink } from 'react-router-dom'
import {
  IconHome2, IconUsers, IconCalendar, IconBuilding, IconInbox, IconBell,
} from '@tabler/icons-react'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/',         label: 'today',    icon: IconHome2 },
  { to: '/family',   label: 'family',   icon: IconUsers },
  { to: '/calendar', label: 'calendar', icon: IconCalendar },
  { to: '/home',     label: 'home',     icon: IconBuilding },
  { to: '/inbox',    label: 'inbox',    icon: IconInbox },
]

export function TopNav() {
  const user     = useAuthStore((s) => s.user)
  const initials = getInitials(user?.user_metadata?.full_name || user?.email || 'Y')

  return (
    <>
      {/* ── Desktop / tablet top bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full" style={{ background: '#1A1A18', height: 52 }}>
        <div className="max-w-[1200px] mx-auto px-5 h-full flex items-center justify-between">

          {/* Logo */}
          <NavLink to="/" className="flex-shrink-0" aria-label="Kinly home">
            <span style={{ fontSize: 15, fontWeight: 500, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
              kinly
              <span style={{
                display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                background: '#e8a44a', verticalAlign: 'middle', marginLeft: 4, marginBottom: 2,
              }} />
            </span>
          </NavLink>

          {/* Nav tabs — hidden on mobile */}
          <nav className="hidden sm:flex items-center gap-0.5">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-2.5 py-1.5 rounded-full text-[11px] transition-colors duration-100 ` +
                  (isActive
                    ? 'text-white font-medium bg-white/10'
                    : 'text-white/45 hover:text-white')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right — bell + avatar */}
          <div className="flex items-center gap-3">
            <button className="p-1 text-white/40 hover:text-white transition-colors" aria-label="Notifications">
              <IconBell size={17} strokeWidth={1.75} />
            </button>
            <button
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}
              aria-label="Account"
            >
              {initials}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile bottom nav (sm and below) ─────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 sm:hidden flex justify-around items-center"
        style={{
          background:   '#ffffff',
          borderTop:    '0.5px solid #efefef',
          paddingTop:    10,
          paddingBottom: 12,
        }}
      >
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              'flex flex-col items-center gap-0.5 ' +
              (isActive ? 'text-[#1a1a1a]' : 'text-[#bbbbbb]')
            }
          >
            <Icon size={20} strokeWidth={1.75} />
            <span style={{ fontSize: 9, fontWeight: 500 }}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}

function getInitials(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (parts[0]?.[0] ?? 'Y').toUpperCase()
}
