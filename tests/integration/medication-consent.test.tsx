import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdministerMedicationModal } from '../../src/features/medications/AdministerMedicationModal'
import type { Medication } from '../../src/types/medication'

const baseMedication: Medication = {
  id: 'med-consented',
  student_id: 'student-1',
  medication_name: 'Consented Med',
  brand_name: null,
  form: 'tablet',
  dose_amount: 5,
  dose_unit: 'mg',
  frequency: 'once daily',
  schedule_times: null,
  prescribing_physician: null,
  start_date: null,
  end_date: null,
  active: true,
  parent_consent_on_file: true,
  consent_date: null,
  consent_method: null,
  special_instructions: null,
  created_at: '',
}

const medications: Medication[] = [
  baseMedication,
  {
    ...baseMedication,
    id: 'med-no-consent',
    medication_name: 'No Consent Med',
    parent_consent_on_file: false,
  },
  { ...baseMedication, id: 'med-inactive', medication_name: 'Inactive Med', active: false },
]

vi.mock('../../src/features/medications/useMedications', () => ({
  useMedications: () => ({ medications, loading: false, error: null, refetch: vi.fn() }),
}))

describe('AdministerMedicationModal consent gate (FR-013)', () => {
  it('only lists medications that are active and have consent on file', () => {
    render(<AdministerMedicationModal studentId="student-1" selections={[]} onChange={vi.fn()} />)

    expect(screen.getByText(/Consented Med/)).toBeInTheDocument()
    expect(screen.queryByText(/No Consent Med/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Inactive Med/)).not.toBeInTheDocument()
  })
})
