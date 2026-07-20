import { useMedications } from './useMedications'

export interface MedicationSelection {
  medicationId: string
  doseGiven: string
}

interface AdministerMedicationModalProps {
  studentId: string
  selections: MedicationSelection[]
  onChange: (selections: MedicationSelection[]) => void
}

/**
 * Administration picker (F-4.3). Only shows medications that are active AND have
 * parent consent on file (FR-013) — this is a UX convenience; the authoritative
 * check happens server-side in medication_is_administrable()
 * (supabase/migrations/0015_rls_policies.sql) regardless of what's shown here.
 */
export function AdministerMedicationModal({
  studentId,
  selections,
  onChange,
}: AdministerMedicationModalProps) {
  const { medications, loading, error } = useMedications(studentId)
  const eligible = medications.filter((m) => m.active && m.parent_consent_on_file)

  function toggle(medicationId: string) {
    const existing = selections.find((s) => s.medicationId === medicationId)
    if (existing) {
      onChange(selections.filter((s) => s.medicationId !== medicationId))
    } else {
      onChange([...selections, { medicationId, doseGiven: '' }])
    }
  }

  function setDose(medicationId: string, doseGiven: string) {
    onChange(selections.map((s) => (s.medicationId === medicationId ? { ...s, doseGiven } : s)))
  }

  if (loading) return <p className="text-sm text-gray-500">Loading medications…</p>
  if (error) return <p className="text-sm text-red-600">Failed to load medications: {error}</p>
  if (eligible.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No medications available for administration (consent required).
      </p>
    )
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-gray-700">Administer medication</legend>
      {eligible.map((m) => {
        const selection = selections.find((s) => s.medicationId === m.id)
        return (
          <div key={m.id} className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!selection} onChange={() => toggle(m.id)} />
              {m.medication_name} ({m.dose_amount ?? '?'} {m.dose_unit ?? ''})
            </label>
            {selection && (
              <input
                aria-label={`Dose given for ${m.medication_name}`}
                placeholder="Dose given"
                value={selection.doseGiven}
                onChange={(e) => setDose(m.id, e.target.value)}
                className="rounded border px-2 py-1 text-sm"
              />
            )}
          </div>
        )
      })}
    </fieldset>
  )
}
