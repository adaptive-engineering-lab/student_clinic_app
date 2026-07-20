import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { MedicalAlertSeverity, MedicalAlertType, NewMedicalAlert } from '../../types/student'

interface MedicalAlertFormProps {
  studentId: string
  onSaved: () => void
}

const SEVERITIES: MedicalAlertSeverity[] = ['mild', 'moderate', 'severe', 'life-threatening']
const TYPES: MedicalAlertType[] = ['allergy', 'condition']

/**
 * Adds a single allergy/condition (F-2.1/F-2.2). Medical alerts have no direct SELECT
 * grant (read-audited, see useMedicalAlerts) but INSERT is direct — the RLS insert
 * policy still requires nurse/super_admin.
 */
export function MedicalAlertForm({ studentId, onSaved }: MedicalAlertFormProps) {
  const [type, setType] = useState<MedicalAlertType>('allergy')
  const [name, setName] = useState('')
  const [subtype, setSubtype] = useState('')
  const [severity, setSeverity] = useState<MedicalAlertSeverity>('mild')
  const [requiresImmediateAction, setRequiresImmediateAction] = useState(false)
  const [epipenOnFile, setEpipenOnFile] = useState(false)
  const [inhalerOnFile, setInhalerOnFile] = useState(false)
  const [storageLocation, setStorageLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: NewMedicalAlert = {
      student_id: studentId,
      type,
      subtype: type === 'allergy' && subtype ? subtype : null,
      name,
      severity,
      requires_immediate_action: requiresImmediateAction,
      epipen_on_file: epipenOnFile,
      inhaler_on_file: inhalerOnFile,
      storage_location: epipenOnFile || inhalerOnFile ? storageLocation : null,
      notes: notes || null,
    }

    const { error } = await supabase.from('medical_alerts').insert(payload)
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setName('')
    setSubtype('')
    setNotes('')
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded border p-4">
      <h3 className="font-semibold">Add allergy / condition</h3>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <label className="block">
        <span className="text-sm text-gray-700">Type</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as MedicalAlertType)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-gray-700">
          {type === 'allergy' ? 'Allergen' : 'Condition name'}
        </span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      {type === 'allergy' && (
        <label className="block">
          <span className="text-sm text-gray-700">Allergy subtype</span>
          <select
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="">—</option>
            <option value="food">food</option>
            <option value="drug">drug</option>
            <option value="environmental">environmental</option>
            <option value="other">other</option>
          </select>
        </label>
      )}

      <label className="block">
        <span className="text-sm text-gray-700">Severity</span>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as MedicalAlertSeverity)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={requiresImmediateAction}
          onChange={(e) => setRequiresImmediateAction(e.target.checked)}
        />
        <span className="text-sm text-gray-700">Requires immediate action</span>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={epipenOnFile}
          onChange={(e) => setEpipenOnFile(e.target.checked)}
        />
        <span className="text-sm text-gray-700">Epipen on file</span>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={inhalerOnFile}
          onChange={(e) => setInhalerOnFile(e.target.checked)}
        />
        <span className="text-sm text-gray-700">Inhaler on file</span>
      </label>

      {(epipenOnFile || inhalerOnFile) && (
        <label className="block">
          <span className="text-sm text-gray-700">Storage location</span>
          <input
            required
            value={storageLocation}
            onChange={(e) => setStorageLocation(e.target.value)}
            placeholder="e.g. Locked cabinet A, shelf 2"
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
      )}

      <label className="block">
        <span className="text-sm text-gray-700">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Add alert'}
      </button>
    </form>
  )
}
