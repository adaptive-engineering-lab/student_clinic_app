import { useEffect, useMemo, useRef } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import { useSession } from '../../lib/auth/useSession'
import {
  appendEntry,
  loadHistory,
  saveHistory,
} from '../../lib/navigation/navigationHistoryStore'
import {
  BREADCRUMB_ROUTES,
  DASHBOARD_LABEL,
  DASHBOARD_PATH,
  type BreadcrumbRouteConfig,
} from '../../routes/breadcrumbs'
import type { BreadcrumbPath, BreadcrumbSegment, NavigationHistoryRecord } from '../../types/navigation'

const COLLAPSE_THRESHOLD = 4

interface MatchedCrumb {
  path: string
  config: BreadcrumbRouteConfig
  params: Record<string, string | undefined>
}

function resolveCrumb(pathname: string): MatchedCrumb | null {
  for (const [pattern, config] of Object.entries(BREADCRUMB_ROUTES)) {
    const match = matchPath(pattern, pathname)
    if (match) return { path: pattern, config, params: match.params }
  }
  return null
}

function resolveLabel(
  label: BreadcrumbRouteConfig['label'],
  params: Record<string, string | undefined>,
): string {
  return typeof label === 'function' ? label(params) : label
}

/** Root-to-current breadcrumb, role-filtered, plus persisted-history side effects. */
export function useNavigationHistory(): { breadcrumb: BreadcrumbPath } {
  const location = useLocation()
  const { session, role } = useSession()
  const userId = session?.user.id

  const historyRef = useRef<NavigationHistoryRecord | null>(null)
  const loadedForUser = useRef<string | undefined>(undefined)

  // Load persisted history once per signed-in user (FR-007, FR-013).
  useEffect(() => {
    if (!userId) {
      historyRef.current = null
      loadedForUser.current = undefined
      return
    }
    if (loadedForUser.current === userId) return
    historyRef.current = loadHistory(userId)
    loadedForUser.current = userId
  }, [userId])

  // Record every route change so history survives a refresh/restart.
  useEffect(() => {
    if (!userId) return

    const matched = resolveCrumb(location.pathname)
    const label = matched ? resolveLabel(matched.config.label, matched.params) : DASHBOARD_LABEL

    const nextRecord = appendEntry(historyRef.current, userId, {
      path: location.pathname,
      label,
      visitedAt: new Date().toISOString(),
    })
    historyRef.current = nextRecord
    saveHistory(nextRecord)
  }, [location.pathname, userId])

  const breadcrumb = useMemo<BreadcrumbPath>(() => {
    const matched = resolveCrumb(location.pathname)
    if (!matched) return { segments: [], isCollapsed: false }
    if (role && !matched.config.allow.includes(role)) return { segments: [], isCollapsed: false }

    const chain: MatchedCrumb[] = []
    let current: MatchedCrumb | null = matched
    while (current) {
      chain.unshift(current)
      if (!current.config.parent) break
      const parentConfig: BreadcrumbRouteConfig | undefined = BREADCRUMB_ROUTES[current.config.parent]
      if (!parentConfig) break
      current = { path: current.config.parent, config: parentConfig, params: current.params }
    }

    const segments: BreadcrumbSegment[] = [
      { path: DASHBOARD_PATH, label: DASHBOARD_LABEL, isCurrent: false },
      ...chain.map((entry, idx): BreadcrumbSegment => ({
        path: idx === chain.length - 1 ? undefined : entry.path,
        label: resolveLabel(entry.config.label, entry.params),
        isCurrent: idx === chain.length - 1,
      })),
    ]

    return { segments, isCollapsed: segments.length > COLLAPSE_THRESHOLD }
  }, [location.pathname, role])

  return { breadcrumb }
}

/** Last non-root path recorded for `userId`, used to restore context on a fresh PWA launch. */
export function getLastPath(userId: string): string | null {
  const record = loadHistory(userId)
  if (!record || record.entries.length === 0) return null
  const last = record.entries[record.entries.length - 1]
  return last.path === DASHBOARD_PATH ? null : last.path
}
