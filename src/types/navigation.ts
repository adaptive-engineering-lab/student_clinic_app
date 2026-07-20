import type { AppRole } from '../lib/auth/useSession'

/** Route `handle` contract — see specs/002-mobile-nav-history/contracts/navigation-contracts.md §1 */
export type CrumbHandle = {
  crumb: string | ((params: Record<string, string | undefined>) => string)
}

export interface NavigationEntry {
  path: string
  label: string
  visitedAt: string
}

export const NAV_HISTORY_VERSION = 1
export const NAV_HISTORY_MAX_ENTRIES = 25

export interface NavigationHistoryRecord {
  userId: string
  version: number
  entries: NavigationEntry[]
  updatedAt: string
}

export interface BreadcrumbSegment {
  path?: string
  label: string
  isCurrent: boolean
}

export interface BreadcrumbPath {
  segments: BreadcrumbSegment[]
  isCollapsed: boolean
}

export interface TabBarEntry {
  path: string
  label: string
  icon: 'dashboard' | 'students' | 'reports'
  allow: AppRole[]
}
