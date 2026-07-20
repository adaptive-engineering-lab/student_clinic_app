import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { EmergencyContact, NewEmergencyContact } from '../../types/student'

export const MIN_EMERGENCY_CONTACTS = 2

interface EmergencyContactsFormProps {
  studentId: string
  /** Called whenever the contact list changes, so the parent can gate on count (FR-003). */
  onContactsChange?: (contacts: EmergencyContact[]) => void
}

/**
 * Manages a student's emergency contacts. A profile is not considered complete
 * (FR-003) until at least MIN_EMERGENCY_CONTACTS exist — enforced here as a UI gate
 * on the "complete" affordance, since the database itself allows 0..N contact rows.
 */
export function EmergencyContactsForm({ studentId, onContactsChange }: EmergencyContactsFormProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [phonePrimary, setPhonePrimary] = useState('')
  const [authorisedToPickup, setAuthorisedToPickup] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadContacts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at')
    if (!error) {
      const rows = (data ?? []) as EmergencyContact[]
      setContacts(rows)
      onContactsChange?.(rows)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadContacts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: NewEmergencyContact = {
      student_id: studentId,
      name,
      relationship,
      phone_primary: phonePrimary,
      phone_secondary: null,
      email: null,
      authorised_to_pickup: authorisedToPickup,
    }

    const { error } = await supabase.from('emergency_contacts').insert(payload)
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setName('')
    setRelationship('')
    setPhonePrimary('')
    setAuthorisedToPickup(false)
    await loadContacts()
  }

  const isComplete = contacts.length >= MIN_EMERGENCY_CONTACTS

  return (
    <div className="space-y-3 rounded border p-4">
      <h3 className="font-semibold">Emergency contacts</h3>

      {!loading && !isComplete && (
        <p role="alert" className="rounded bg-amber-100 p-2 text-sm text-amber-900">
          At least {MIN_EMERGENCY_CONTACTS} emergency contacts are required. Currently{' '}
          {contacts.length}.
        </p>
      )}

      <ul className="space-y-1 text-sm">
        {contacts.map((c) => (
          <li key={c.id}>
            {c.name} ({c.relationship}) — {c.phone_primary}
            {c.authorised_to_pickup ? ' · authorised to pick up' : ''}
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="space-y-2">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <label className="block">
          <span className="text-sm text-gray-700">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Relationship</span>
          <input
            required
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Primary phone</span>
          <input
            required
            value={phonePrimary}
            onChange={(e) => setPhonePrimary(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={authorisedToPickup}
            onChange={(e) => setAuthorisedToPickup(e.target.checked)}
          />
          <span className="text-sm text-gray-700">Authorised to pick up</span>
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Add contact'}
        </button>
      </form>
    </div>
  )
}
