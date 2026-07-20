import type { TabBarEntry } from '../../types/navigation'

/**
 * `allow` mirrors the `allow` array already passed to `RequireRole` for the matching
 * route in src/routes/index.tsx — kept in sync manually (see
 * contracts/navigation-contracts.md §4). If a route's role gate changes, update both.
 */
export const TAB_BAR_ENTRIES: TabBarEntry[] = [
  { path: '/', label: 'Dashboard', icon: 'dashboard', allow: ['nurse', 'admin', 'super_admin'] },
  { path: '/students', label: 'Students', icon: 'students', allow: ['nurse', 'super_admin'] },
  { path: '/reports', label: 'Reports', icon: 'reports', allow: ['nurse', 'admin', 'super_admin'] },
]
