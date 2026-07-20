import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BottomTabBar } from '../../src/components/navigation/BottomTabBar'
import type { AppRole, SessionState } from '../../src/lib/auth/useSession'

let sessionState: SessionState

vi.mock('../../src/lib/auth/useSession', () => ({
  useSession: () => sessionState,
}))

function makeSession(role: AppRole | null): SessionState {
  return {
    session: role ? ({ user: { id: 'user-1', email: 'nurse@test.local' } } as SessionState['session']) : null,
    role,
    loading: false,
  }
}

function renderTabBar() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <BottomTabBar />
    </MemoryRouter>,
  )
}

describe('BottomTabBar role filtering (FR-009)', () => {
  beforeEach(() => {
    sessionState = makeSession('nurse')
  })

  it('shows Dashboard, Students, and Reports for nurse', () => {
    renderTabBar()
    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Students/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Reports/ })).toBeInTheDocument()
  })

  it('shows Dashboard, Students, and Reports for super_admin', () => {
    sessionState = makeSession('super_admin')
    renderTabBar()
    expect(screen.getByRole('link', { name: /Students/ })).toBeInTheDocument()
  })

  it('withholds the Students tab for admin', () => {
    sessionState = makeSession('admin')
    renderTabBar()
    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Students/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Reports/ })).toBeInTheDocument()
  })

  it('renders nothing when no role is assigned', () => {
    sessionState = makeSession(null)
    renderTabBar()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
