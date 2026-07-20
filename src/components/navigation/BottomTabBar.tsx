import { NavLink } from 'react-router-dom'
import { useSession } from '../../lib/auth/useSession'
import { TAB_BAR_ENTRIES } from './tabBarConfig'
import type { TabBarEntry } from '../../types/navigation'

/** Persistent mobile bottom tab bar — hidden at/above the `md` breakpoint (research.md §4). */
export function BottomTabBar() {
  const { role } = useSession()
  if (!role) return null

  const entries = TAB_BAR_ENTRIES.filter((entry) => entry.allow.includes(role))
  if (entries.length === 0) return null

  return (
    <nav
      aria-label="Main sections"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-white md:hidden"
    >
      {entries.map((entry) => (
        <TabLink key={entry.path} entry={entry} />
      ))}
    </nav>
  )
}

function TabLink({ entry }: { entry: TabBarEntry }) {
  return (
    <NavLink
      to={entry.path}
      end={entry.path === '/'}
      className={({ isActive }) =>
        `flex min-h-11 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs ${
          isActive ? 'font-semibold text-red-700' : 'text-gray-600'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <TabIcon icon={entry.icon} active={isActive} />
          <span>{entry.label}</span>
        </>
      )}
    </NavLink>
  )
}

function TabIcon({ icon, active }: { icon: TabBarEntry['icon']; active: boolean }) {
  const color = active ? 'currentColor' : '#6b7280'
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2 }

  switch (icon) {
    case 'dashboard':
      return (
        <svg {...common} aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      )
    case 'students':
      return (
        <svg {...common} aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
        </svg>
      )
    case 'reports':
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 19h16" />
          <rect x="6" y="10" width="3" height="7" />
          <rect x="11" y="6" width="3" height="11" />
          <rect x="16" y="13" width="3" height="4" />
        </svg>
      )
  }
}
