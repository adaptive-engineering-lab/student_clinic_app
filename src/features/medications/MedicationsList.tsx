import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { useMedications } from './useMedications'
import type { ConsentMethod, DoseUnit, MedicationForm, NewMedication } from '../../types/medication'

interface MedicationsListProps {
  studentId: string
}

const FORMS: MedicationForm[] = ['tablet', 'liquid', 'inhaler', 'injection', 'other']
const DOSE_UNITS: DoseUnit[] = ['mg', 'ml', 'puff', 'other']
const CONSENT_METHODS: ConsentMethod[] = ['signed form', 'email', 'portal']

/** F-4.1/F-4.2/F-4.4: medications on file, including consent tracking. */
export function MedicationsList({ studentId }: MedicationsListProps) {
  const { medications, loading, error: loadError, refetch } = useMedications(studentId)

  const [medicationName, setMedicationName] = useState('')
  const [form, setForm] = useState<MedicationForm>('tablet')
  const [doseAmount, setDoseAmount] = useState('')
  const [doseUnit, setDoseUnit] = useState<DoseUnit>('mg')
  const [frequency, setFrequency] = useState('')
  const [prescribingPhysician, setPrescribingPhysician] = useState('')
  const [parentConsentOnFile, setParentConsentOnFile] = useState(false)
  const [consentMethod, setConsentMethod] = useState<ConsentMethod>('signed form')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError(null)

    const payload: NewMedication = {
      student_id: studentId,
      medication_name: medicationName,
      brand_name: null,
      form,
      dose_amount: doseAmount ? Number(doseAmount) : null,
      dose_unit: doseUnit,
      frequency: frequency || null,
      schedule_times: null,
      prescribing_physician: prescribingPhysician || null,
      start_date: null,
      end_date: null,
      active: true,
      parent_consent_on_file: parentConsentOnFile,
      consent_date: parentConsentOnFile ? new Date().toISOString().slice(0, 10) : null,
      consent_method: parentConsentOnFile ? consentMethod : null,
      special_instructions: null,
    }

    const { error } = await supabase.from('medications').insert(payload)
    setSubmitting(false)
    if (error) {
      setSubmitError(error.message)
      return
    }
    setMedicationName('')
    setDoseAmount('')
    setFrequency('')
    setPrescribingPhysician('')
    setParentConsentOnFile(false)
    await refetch()
  }

  return (
    <div className="space-y-3 rounded border p-4">
      <h3 className="font-semibold">Medications on file</h3>
      {loadError && <p className="text-sm text-red-600">Failed to load medications: {loadError}</p>}

      {!loading && (
        <ul className="space-y-1 text-sm">
          {medications.map((m) => (
            <li key={m.id}>
              {m.medication_name} — {m.dose_amount ?? '?'} {m.dose_unit ?? ''} {m.frequency ?? ''}
              {m.parent_consent_on_file ? (
                <span className="text-green-700"> · consent on file</span>
              ) : (
                <span className="text-amber-700">
                  {' '}
                  · consent NOT on file (excluded from administration)
                </span>
              )}
              {!m.active && <span className="text-gray-500"> · inactive</span>}
            </li>
          ))}
          {medications.length === 0 && <li className="text-gray-500">No medications on file.</li>}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        {submitError && <p className="text-sm text-red-600">{submitError}</p>}
        <label className="block">
          <span className="text-sm text-gray-700">Medication name</span>
          <input
            required
            value={medicationName}
            onChange={(e) => setMedicationName(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-sm text-gray-700">Form</span>
            <select
              value={form}
              onChange={(e) => setForm(e.target.value as MedicationForm)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              {FORMS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Dose amount</span>
            <input
              type="number"
              step="0.01"
              value={doseAmount}
              onChange={(e) => setDoseAmount(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Dose unit</span>
            <select
              value={doseUnit}
              onChange={(e) => setDoseUnit(e.target.value as DoseUnit)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              {DOSE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-gray-700">Frequency</span>
          <input
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="e.g. twice daily"
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Prescribing physician</span>
          <input
            value={prescribingPhysician}
            onChange={(e) => setPrescribingPhysician(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={parentConsentOnFile}
            onChange={(e) => setParentConsentOnFile(e.target.checked)}
          />
          <span className="text-sm text-gray-700">Parent consent on file (FR-013)</span>
        </label>
        {parentConsentOnFile && (
          <label className="block">
            <span className="text-sm text-gray-700">Consent method</span>
            <select
              value={consentMethod}
              onChange={(e) => setConsentMethod(e.target.value as ConsentMethod)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              {CONSENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Add medication'}
        </button>
      </form>
    </div>
  )
}
