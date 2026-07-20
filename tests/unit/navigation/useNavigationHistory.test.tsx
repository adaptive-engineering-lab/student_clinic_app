import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useNavigationHistory } from '../../../src/components/navigation/useNavigationHistory'
import type { AppRole, SessionState } from '../../../src/lib/auth/useSession'

let sessionState: SessionState

vi.mock('../../../src/lib/auth/useSession', () => ({
  useSession: () => sessionState,
}))

function makeSession(role: AppRole | null): SessionState {
  return {
    session: role
      ? ({ user: { id: 'user-1', email: 'nurse@test.local' } } as SessionState['session'])
      : null,
    role,
    loading: false,
  }
}

function wrapper(initialEntry: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  )
}

describe('useNavigationHistory', () => {
  beforeEach(() => {
    window.localStorage.clear()
    sessionState = makeSession('nurse')
  })

  it('returns no breadcrumb on the dashboard route (FR-001)', () => {
    const { result } = renderHook(() => useNavigationHistory(), { wrapper: wrapper('/') })
    expect(result.current.breadcrumb.segments).toEqual([])
  })

  it('builds a Dashboard / Students trail on the students route', () => {
    const { result } = renderHook(() => useNavigationHistory(), { wrapper: wrapper('/students') })
    const labels = result.current.breadcrumb.segments.map((s) => s.label)
    expect(labels).toEqual(['Dashboard', 'Students'])
    expect(result.current.breadcrumb.segments.at(-1)?.isCurrent).toBe(true)
    expect(result.current.breadcrumb.segments[0].isCurrent).toBe(false)
    expect(result.current.breadcrumb.segments[0].path).toBe('/')
  })

  it('builds the full ancestor chain for a nested route', () => {
    const { result } = renderHook(() => useNavigationHistory(), {
      wrapper: wrapper('/students/abc-123/visits/new'),
    })
    const labels = result.current.breadcrumb.segments.map((s) => s.label)
    expect(labels).toEqual(['Dashboard', 'Students', 'New Visit'])
    // Only the current segment is non-navigable.
    expect(result.current.breadcrumb.segments.filter((s) => s.path === undefined)).toHaveLength(1)
  })

  it('hides a route the current role is not allowed to see (FR-009)', () => {
    sessionState = makeSession('admin')
    const { result } = renderHook(() => useNavigationHistory(), { wrapper: wrapper('/students') })
    expect(result.current.breadcrumb.segments).toEqual([])
  })

  it('resolves a logical breadcrumb even with no prior in-app navigation (FR-008)', () => {
    // Simulates a direct link: MemoryRouter starts fresh, no navigation happened first.
    const { result } = renderHook(() => useNavigationHistory(), { wrapper: wrapper('/reports') })
    expect(result.current.breadcrumb.segments.map((s) => s.label)).toEqual(['Dashboard', 'Reports'])
  })
})
