import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { useLocation } from 'react-router-dom'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/analytics': 'Analytics',
  '/hands': 'Hands',
  '/sessions': 'Sessions',
  '/opponents': 'Opponents',
}

export const TopBar = () => {
  const { isDark, toggle } = useTheme()
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'Tracker AI'

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 bg-surface border-b border-[var(--border)]">
      <h1 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h1>

      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
      >
        {isDark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
      </button>
    </header>
  )
}
