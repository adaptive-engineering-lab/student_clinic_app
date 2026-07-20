import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VisitForm } from '../../src/features/visits/VisitForm'

const enqueueWrite = vi.fn()
const flushQueue = vi.fn()

vi.mock('../../src/lib/offline/sync', () => ({
  enqueueWrite: (...args: unknown[]) => enqueueWrite(...args),
  flushQueue: () => flushQueue(),
}))

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'nurse-1' } } } }),
    },
    // VisitForm renders AdministerMedicationModal, which fetches via this RPC.
    rpc: () => Promise.resolve({ data: [], error: null }),
  },
}))

describe('VisitForm disposition gate (FR-010)', () => {
  it('blocks save and shows an error when no disposition is selected', async () => {
    const onSaved = vi.fn()
    render(<VisitForm studentId="student-1" onSaved={onSaved} />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Save visit' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/disposition is required/i)
    expect(enqueueWrite).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('saves once a disposition is selected', async () => {
    const onSaved = vi.fn()
    render(<VisitForm studentId="student-1" onSaved={onSaved} />)

    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Disposition'), 'returned_to_class')
    await user.click(screen.getByRole('button', { name: 'Save visit' }))

    expect(enqueueWrite).toHaveBeenCalledWith(
      'visit',
      'insert',
      expect.any(String),
      expect.objectContaining({ disposition: 'returned_to_class', student_id: 'student-1' }),
    )
    expect(onSaved).toHaveBeenCalled()
  })
})
