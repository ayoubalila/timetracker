import { Link } from 'react-router-dom'

type NavKey = 'dashboard' | 'projects' | 'settings'

const NAV_ITEMS: { key: NavKey; to: string; label: string }[] = [
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard' },
  { key: 'projects', to: '/projects', label: 'Projects' },
  { key: 'settings', to: '/settings', label: 'Settings' },
]

interface AppHeaderProps {
  active: NavKey
  username: string
  onLogout: () => void
}

export function AppHeader({ active, username, onLogout }: AppHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6">
      <span className="shrink-0 text-base font-semibold tracking-tight text-slate-900">
        <span aria-hidden="true">⏱</span> <span className="hidden sm:inline">TimeTracker</span>
      </span>
      <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            data-testid={`nav-${item.key}`}
            className={`shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
              active === item.key
                ? 'bg-accent-soft text-accent'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <span className="hidden text-sm text-slate-500 sm:inline">{username}</span>
        <button
          data-testid="logout-button"
          onClick={onLogout}
          className="text-sm font-medium text-slate-500 transition-colors hover:text-red-600"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
