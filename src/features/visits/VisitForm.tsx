import { useState, type FormEvent } from 'react'
import { ChiefComplaintField } from './ChiefComplaintField'
import { VitalsForm, type Vitals } from './VitalsForm'
import { ParentContactFields, type ParentContactInfo } from './ParentContactFields'
import { useSaveVisit } from './useSaveVisit'
import {
  AdministerMedicationModal,
  type MedicationSelection,
} from '../medications/AdministerMedicationModal'
import { useAdministerMedication } from '../medications/useAdministerMedication'
import { useLogParentContact } from '../communications/useLogParentContact'
import type { ActionTaken, ChiefComplaint, Disposition } from '../../types/visit'

const ACTIONS: ActionTaken[] = [
  'rest provided',
  'ice applied',
  'medication administered',
  'wound cleaned/dressed',
  'emergency services called',
  'parent/guardian contacted',
  'referred to doctor',
  'other',
]

const DISPOSITIONS: { value: Disposition; label: string }[] = [
  { value: 'returned_to_class', label: 'Returned to class' },
  { value: 'sent_home', label: 'Sent home' },
  { value: 'emergency_transport', label: 'Emergency transport' },
  { value: 'still_in_clinic', label: 'Still in clinic' },
]

interface VisitFormProps {
  studentId: string
  onSaved: () => void
}

/** F-3: full visit form. Disposition is required before save (FR-010). */
export function VisitForm({ studentId, onSaved }: VisitFormProps) {
  const { saveVisit, saving, error } = useSaveVisit()
  const { administer } = useAdministerMedication()
  const { logParentContact } = useLogParentContact()

  const [complaint, setComplaint] = useState<ChiefComplaint>('headache')
  const [complaintNotes, setComplaintNotes] = useState('')
  const [vitals, setVitals] = useState<Vitals>({
    temperature_celsius: null,
    bp_systolic: null,
    bp_diastolic: null,
    pulse_bpm: null,
    oxygen_saturation: null,
  })
  const [assessment, setAssessment] = useState('')
  const [actionsTaken, setActionsTaken] = useState<ActionTaken[]>([])
  const [disposition, setDisposition] = useState<Disposition | ''>('')
  const [dispositionError, setDispositionError] = useState<string | null>(null)
  const [parentContacted, setParentContacted] = useState(false)
  const [parentContactInfo, setParentContactInfo] = useState<ParentContactInfo>({
    contact_name: '',
    contact_method: 'call',
    contact_time: '',
    outcome: 'reached',
    notes: '',
  })
  const [medicationSelections, setMedicationSelections] = useState<MedicationSelection[]>([])

  function toggleAction(action: ActionTaken) {
    setActionsTaken((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action],
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!disposition) {
      setDispositionError('Disposition is required before this visit can be saved.')
      return
    }
    setDispositionError(null)

    const contactTime = new Date().toISOString()
    const savedVisit = await saveVisit({
      student_id: studentId,
      visited_at: new Date().toISOString(),
      chief_complaint: complaint,
      chief_complaint_notes: complaintNotes || null,
      temperature_celsius: vitals.temperature_celsius,
      bp_systolic: vitals.bp_systolic,
      bp_diastolic: vitals.bp_diastolic,
      pulse_bpm: vitals.pulse_bpm,
      oxygen_saturation: vitals.oxygen_saturation,
      assessment: assessment || null,
      actions_taken: actionsTaken.length ? actionsTaken : null,
      disposition,
      parent_contacted: parentContacted,
      parent_contact_log: parentContacted
        ? {
            contact_name: parentContactInfo.contact_name,
            contact_method: parentContactInfo.contact_method,
            contact_time: contactTime,
            outcome: parentContactInfo.outcome,
            notes: parentContactInfo.notes,
          }
        : null,
    })

    if (!savedVisit) return

    for (const selection of medicationSelections) {
      await administer({
        medicationId: selection.medicationId,
        visitId: savedVisit.id,
        administeredBy: savedVisit.nurseId,
        doseGiven: selection.doseGiven,
      })
    }

    // FR-015: every parent-contacted visit auto-creates a communication log entry.
    if (parentContacted) {
      await logParentContact({
        student_id: studentId,
        visit_id: savedVisit.id,
        contact_name: parentContactInfo.contact_name || null,
        relationship: null,
        method: parentContactInfo.contact_method,
        timestamp: contactTime,
        outcome: parentContactInfo.outcome,
        notes: parentContactInfo.notes || null,
      })
    }

    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded border p-4">
      <h3 className="font-semibold">New visit</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ChiefComplaintField
        complaint={complaint}
        onComplaintChange={setComplaint}
        notes={complaintNotes}
        onNotesChange={setComplaintNotes}
      />

      <VitalsForm vitals={vitals} onChange={setVitals} />

      <label className="block">
        <span className="text-sm text-gray-700">Assessment / notes</span>
        <textarea
          value={assessment}
          maxLength={5000}
          onChange={(e) => setAssessment(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          rows={4}
        />
      </label>

      <fieldset>
        <legend className="text-sm font-semibold text-gray-700">Actions taken</legend>
        <div className="grid grid-cols-2 gap-1">
          {ACTIONS.map((action) => (
            <label key={action} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={actionsTaken.includes(action)}
                onChange={() => toggleAction(action)}
              />
              {action}
            </label>
          ))}
        </div>
      </fieldset>

      <AdministerMedicationModal
        studentId={studentId}
        selections={medicationSelections}
        onChange={setMedicationSelections}
      />

      <label className="block">
        <span className="text-sm text-gray-700">Disposition</span>
        <select
          value={disposition}
          onChange={(e) => setDisposition(e.target.value as Disposition)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">Select disposition…</option>
          {DISPOSITIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        {dispositionError && (
          <p role="alert" className="text-sm text-red-600">
            {dispositionError}
          </p>
        )}
      </label>

      <ParentContactFields
        contacted={parentContacted}
        onContactedChange={setParentContacted}
        info={parentContactInfo}
        onInfoChange={setParentContactInfo}
      />

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save visit'}
      </button>
    </form>
  )
}
