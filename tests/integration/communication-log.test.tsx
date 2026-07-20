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

describe('parent-contacted visit auto-creates a communication_log entry (FR-015)', () => {
  it('does not log a communication entry when parent was not contacted', async () => {
    const onSaved = vi.fn()
    render(<VisitForm studentId="student-1" onSaved={onSaved} />)

    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Disposition'), 'returned_to_class')
    await user.click(screen.getByRole('button', { name: 'Save visit' }))

    expect(enqueueWrite).toHaveBeenCalledWith(
      'visit',
      'insert',
      expect.any(String),
      expect.any(Object),
    )
    expect(enqueueWrite).not.toHaveBeenCalledWith(
      'communication_log',
      'insert',
      expect.any(String),
      expect.any(Object),
    )
  })

  it('creates a communication_log entry capturing contact name, method, time, and outcome', async () => {
    const onSaved = vi.fn()
    render(<VisitForm studentId="student-1" onSaved={onSaved} />)

    const user = userEvent.setup()
    // Exact, case-sensitive match: "Actions taken" also has a same-worded but
    // lowercase "parent/guardian contacted" checkbox option (VisitForm's ACTIONS list).
    await user.click(screen.getByRole('checkbox', { name: 'Parent/guardian contacted' }))
    await user.type(screen.getByLabelText('Contact name'), 'Jamie Guardian')
    await user.selectOptions(screen.getByLabelText('Method'), 'text')
    await user.selectOptions(screen.getByLabelText('Outcome'), 'left voicemail')
    await user.selectOptions(screen.getByLabelText('Disposition'), 'returned_to_class')
    await user.click(screen.getByRole('button', { name: 'Save visit' }))

    expect(enqueueWrite).toHaveBeenCalledWith(
      'communication_log',
      'insert',
      expect.any(String),
      expect.objectContaining({
        student_id: 'student-1',
        contact_name: 'Jamie Guardian',
        method: 'text',
        outcome: 'left voicemail',
        timestamp: expect.any(String),
      }),
    )
    expect(onSaved).toHaveBeenCalled()
  })
})
