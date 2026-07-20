import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigationHistory } from './useNavigationHistory'
import type { BreadcrumbSegment } from '../../types/navigation'

/**
 * Renders nothing on Dashboard/login (useNavigationHistory returns an empty segment
 * list there per FR-001) and on any route the current role can't access (FR-009).
 */
export function BreadcrumbTrail() {
  const { breadcrumb } = useNavigationHistory()
  const [expanded, setExpanded] = useState(false)

  if (breadcrumb.segments.length === 0) return null

  const visible =
    breadcrumb.isCollapsed && !expanded
      ? collapse(breadcrumb.segments)
      : breadcrumb.segments.map((segment) => ({ segment, isEllipsis: false as const }))

  return (
    <nav aria-label="Breadcrumb" className="border-b bg-white px-4 py-2 text-sm">
      <ol className="flex flex-wrap items-center gap-1">
        {visible.map((item, idx) =>
          item.isEllipsis ? (
            <li key="ellipsis" className="flex items-center">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-label="Show full breadcrumb trail"
                className="flex min-h-11 min-w-11 items-center justify-center px-2 text-gray-500 hover:text-gray-800"
              >
                …
              </button>
              <Separator />
            </li>
          ) : (
            <li key={item.segment.path ?? item.segment.label} className="flex items-center">
              <Crumb segment={item.segment} />
              {idx < visible.length - 1 && <Separator />}
            </li>
          ),
        )}
      </ol>
    </nav>
  )
}

function Crumb({ segment }: { segment: BreadcrumbSegment }) {
  if (segment.isCurrent || !segment.path) {
    return (
      <span aria-current={segment.isCurrent ? 'page' : undefined} className="px-2 py-2 font-medium text-gray-900">
        {segment.label}
      </span>
    )
  }

  return (
    <Link
      to={segment.path}
      className="flex min-h-11 items-center px-2 py-2 text-red-700 underline-offset-2 hover:underline"
    >
      {segment.label}
    </Link>
  )
}

function Separator() {
  return (
    <span aria-hidden="true" className="px-0.5 text-gray-400">
      /
    </span>
  )
}

type VisibleItem = { segment: BreadcrumbSegment; isEllipsis: false } | { segment: BreadcrumbSegment; isEllipsis: true }

/** First / … / second-to-last / current — research.md §5. */
function collapse(segments: BreadcrumbSegment[]): VisibleItem[] {
  const first = segments[0]
  const secondToLast = segments[segments.length - 2]
  const current = segments[segments.length - 1]

  return [
    { segment: first, isEllipsis: false },
    { segment: { label: '…', isCurrent: false }, isEllipsis: true },
    { segment: secondToLast, isEllipsis: false },
    { segment: current, isEllipsis: false },
  ]
}
