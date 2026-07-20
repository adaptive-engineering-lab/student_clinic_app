import type { AppRole } from '../lib/auth/useSession'

export interface BreadcrumbRouteConfig {
  /** Static label, or a resolver fed the route's matched params. */
  label: string | ((params: Record<string, string | undefined>) => string)
  /** Path of the logical parent crumb. Omit for routes whose only ancestor is Dashboard. */
  parent?: string
  /** Roles that may see/navigate this crumb. Mirrors the `allow` list already passed to
   *  `RequireRole` for this route in src/routes/index.tsx — kept in sync manually. */
  allow: AppRole[]
}

export const DASHBOARD_PATH = '/'
export const DASHBOARD_LABEL = 'Dashboard'

/**
 * Static route → breadcrumb registry, matched against the current pathname via
 * `matchPath`. Dashboard (`/`) and `/login` are intentionally absent — the spec (FR-001)
 * excludes them from the trail.
 *
 * Note: `/students` has no per-student URL today (selection is in-page state), so the
 * trail stops at route granularity here rather than adding a distinct "student name"
 * crumb level — see spec.md Assumptions for this implementation-time decision.
 */
export const BREADCRUMB_ROUTES: Record<string, BreadcrumbRouteConfig> = {
  '/students': {
    label: 'Students',
    allow: ['nurse', 'super_admin'],
  },
  '/students/:studentId/visits/new': {
    label: 'New Visit',
    parent: '/students',
    allow: ['nurse', 'super_admin'],
  },
  '/reports': {
    label: 'Reports',
    allow: ['nurse', 'admin', 'super_admin'],
  },
}
