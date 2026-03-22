import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BarChart2, List, Clock, Users } from 'lucide-react'
import { cn } from '../../lib/cn'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/hands', icon: List, label: 'Hands' },
  { to: '/sessions', icon: Clock, label: 'Sessions' },
  { to: '/opponents', icon: Users, label: 'Opponents' },
]

export const Sidebar = () => {
  return (
    <aside className="w-56 shrink-0 flex flex-col h-full bg-surface border-r border-[var(--border)]">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-[var(--border)]">
        <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">
          Tracker<span className="text-[var(--accent-green)]">AI</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              )
            }
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
        Phase 1 — UI Shell
      </div>
    </aside>
  )
}
