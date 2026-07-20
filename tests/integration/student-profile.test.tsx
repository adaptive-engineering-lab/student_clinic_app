import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  EmergencyContactsForm,
  MIN_EMERGENCY_CONTACTS,
} from '../../src/features/students/EmergencyContactsForm'

const STUDENT_ID = 'student-1'

let contactRows: Array<Record<string, unknown>>

vi.mock('../../src/lib/supabase', () => {
  return {
    supabase: {
      from: (table: string) => {
        if (table !== 'emergency_contacts') throw new Error(`unexpected table ${table}`)
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: contactRows, error: null }),
            }),
          }),
          insert: (payload: Record<string, unknown>) => {
            contactRows.push({
              id: `contact-${contactRows.length + 1}`,
              created_at: new Date().toISOString(),
              ...payload,
            })
            return Promise.resolve({ error: null })
          },
        }
      },
    },
  }
})

describe('EmergencyContactsForm min-contact gate (FR-003)', () => {
  beforeEach(() => {
    contactRows = []
  })

  it('warns that the profile is incomplete with fewer than 2 contacts', async () => {
    render(<EmergencyContactsForm studentId={STUDENT_ID} />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(`Currently 0`)
    })

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Name'), 'Jane Guardian')
    await user.type(screen.getByLabelText('Relationship'), 'Mother')
    await user.type(screen.getByLabelText('Primary phone'), '555-0100')
    await user.click(screen.getByRole('button', { name: 'Add contact' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Currently 1')
    })
  })

  it('clears the incomplete warning once 2 contacts exist', async () => {
    contactRows = [
      {
        id: 'c1',
        student_id: STUDENT_ID,
        name: 'A',
        relationship: 'Mother',
        phone_primary: '1',
        authorised_to_pickup: false,
        created_at: '',
      },
    ]
    render(<EmergencyContactsForm studentId={STUDENT_ID} />)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Currently 1'))

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Name'), 'Second Contact')
    await user.type(screen.getByLabelText('Relationship'), 'Father')
    await user.type(screen.getByLabelText('Primary phone'), '555-0101')
    await user.click(screen.getByRole('button', { name: 'Add contact' }))

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
    expect(contactRows.length).toBe(MIN_EMERGENCY_CONTACTS)
  })
})
