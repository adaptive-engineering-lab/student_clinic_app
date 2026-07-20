import { useState, type FormEvent } from 'react'
import { useLogParentContact } from './useLogParentContact'
import type { CommunicationMethod, CommunicationOutcome } from '../../types/communication'

interface CommunicationLogFormProps {
  studentId: string
}

const METHODS: CommunicationMethod[] = ['call', 'text', 'email']
const OUTCOMES: CommunicationOutcome[] = ['reached', 'no answer', 'left voicemail', 'sent message']

/**
 * Standalone parent/guardian contact log entry, started from the student profile
 * rather than auto-created off a visit save (FR-015's "started standalone" path).
 * Queued through the same offline write path as the auto-created entries
 * (Constitution Principle III — parent contact logs must queue locally).
 */
export function CommunicationLogForm({ studentId }: CommunicationLogFormProps) {
  const { logParentContact, error } = useLogParentContact()
  const [contactName, setContactName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [method, setMethod] = useState<CommunicationMethod>('call')
  const [outcome, setOutcome] = useState<CommunicationOutcome>('reached')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setJustSaved(false)

    await logParentContact({
      student_id: studentId,
      visit_id: null,
      contact_name: contactName || null,
      relationship: relationship || null,
      method,
      timestamp: new Date().toISOString(),
      outcome,
      notes: notes || null,
    })

    setSubmitting(false)
    setContactName('')
    setRelationship('')
    setNotes('')
    setJustSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded border p-4">
      <h3 className="font-semibold">Log parent/guardian contact</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {justSaved && <p className="text-sm text-green-700">Contact logged.</p>}

      <label className="block">
        <span className="text-sm text-gray-700">Contact name</span>
        <input
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm text-gray-700">Relationship</span>
        <input
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm text-gray-700">Method</span>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as CommunicationMethod)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm text-gray-700">Outcome</span>
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value as CommunicationOutcome)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          {OUTCOMES.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>

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
        {submitting ? 'Saving…' : 'Log contact'}
      </button>
    </form>
  )
}
