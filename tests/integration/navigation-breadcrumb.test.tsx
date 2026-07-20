import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BreadcrumbTrail } from '../../src/components/navigation/BreadcrumbTrail'
import type { AppRole, SessionState } from '../../src/lib/auth/useSession'

let sessionState: SessionState

vi.mock('../../src/lib/auth/useSession', () => ({
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

function renderApp(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<div>Dashboard Page</div>} />
        <Route
          path="/students"
          element={
            <>
              <BreadcrumbTrail />
              <div>Students Page</div>
            </>
          }
        />
        <Route
          path="/students/:studentId/visits/new"
          element={
            <>
              <BreadcrumbTrail />
              <div>New Visit Page</div>
            </>
          }
        />
        <Route
          path="/reports"
          element={
            <>
              <BreadcrumbTrail />
              <div>Reports Page</div>
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BreadcrumbTrail integration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    sessionState = makeSession('nurse')
  })

  it('renders the full path with a non-interactive current segment', () => {
    renderApp('/students/abc-123/visits/new')

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Students' })).toBeInTheDocument()

    const current = screen.getByText('New Visit')
    expect(current.tagName).not.toBe('A')
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('navigates to an ancestor page when its crumb is tapped, skipping the intermediate screen', async () => {
    const user = userEvent.setup()
    renderApp('/students/abc-123/visits/new')

    await user.click(screen.getByRole('link', { name: 'Students' }))

    expect(await screen.findByText('Students Page')).toBeInTheDocument()
    expect(screen.queryByText('New Visit Page')).not.toBeInTheDocument()
  })

  it('still resolves a logical breadcrumb when the page is reached with no prior in-app navigation', () => {
    renderApp('/reports')

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
  })

  it('renders nothing on the dashboard route', () => {
    renderApp('/')

    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
  })
})
