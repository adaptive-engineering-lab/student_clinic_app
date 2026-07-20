import { useState } from 'react'
import { enqueueWrite, flushQueue } from '../../lib/offline/sync'
import type { NewMedicationAdministration } from '../../types/medication'

/**
 * Queues a medication administration through the same offline write queue as visits
 * (Constitution Principle III), enqueued right after the triggering visit so the
 * chronological flush order (src/lib/offline/sync.ts) guarantees the visit exists
 * server-side before its FK-dependent administration row is sent.
 *
 * Consent/active eligibility is re-verified server-side by
 * medication_is_administrable() (supabase/migrations/0015_rls_policies.sql)
 * regardless of what the client's picker shows (FR-013/FR-014).
 */
export function useAdministerMedication() {
  const [error, setError] = useState<string | null>(null)

  async function administer(input: {
    medicationId: string
    visitId: string
    administeredBy: string
    doseGiven: string
    notes?: string
  }): Promise<boolean> {
    setError(null)
    const id = crypto.randomUUID()
    const payload: NewMedicationAdministration & { id: string } = {
      id,
      medication_id: input.medicationId,
      visit_id: input.visitId,
      administered_by: input.administeredBy,
      dose_given: input.doseGiven || null,
      notes: input.notes || null,
    }
    await enqueueWrite('medication_administration', 'insert', id, payload)
    void flushQueue()
    return true
  }

  return { administer, error }
}
