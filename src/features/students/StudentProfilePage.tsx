import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StudentRoster } from './StudentRoster'
import { StudentProfileForm } from './StudentProfileForm'
import { PhotoUpload } from './PhotoUpload'
import { EmergencyContactsForm, MIN_EMERGENCY_CONTACTS } from './EmergencyContactsForm'
import { MedicalAlertForm } from '../alerts/MedicalAlertForm'
import { AlertBanner } from '../alerts/AlertBanner'
import { useMedicalAlerts } from '../alerts/useMedicalAlerts'
import { MedicationsList } from '../medications/MedicationsList'
import { CommunicationLogForm } from '../communications/CommunicationLogForm'
import { VisitHistoryList } from '../visits/VisitHistoryList'
import type { EmergencyContact, Student } from '../../types/student'

export function StudentProfilePage() {
  const [selected, setSelected] = useState<Student | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [contactCount, setContactCount] = useState(0)
  const [rosterRefreshKey, setRosterRefreshKey] = useState(0)
  const { alerts, error: alertsError, refetch: refetchAlerts } = useMedicalAlerts(selected?.id)

  function handleSaved(student: Student) {
    setSelected(student)
    setCreatingNew(false)
    setRosterRefreshKey((k) => k + 1)
  }

  function handleContactsChange(contacts: EmergencyContact[]) {
    setContactCount(contacts.length)
  }

  return (
    <div className="flex gap-6">
      <div>
        <button
          type="button"
          onClick={() => {
            setSelected(null)
            setCreatingNew(true)
          }}
          className="mb-3 w-full rounded border px-3 py-2 text-sm"
        >
          + New student
        </button>
        <StudentRoster
          onSelect={setSelected}
          selectedId={selected?.id}
          refreshKey={rosterRefreshKey}
        />
      </div>

      <div className="flex-1 space-y-4">
        {creatingNew && <StudentProfileForm onSaved={handleSaved} />}

        {selected && (
          <>
            <AlertBanner alerts={alerts} />
            {alertsError && (
              <p className="text-sm text-red-600">Failed to load alerts: {alertsError}</p>
            )}

            <Link
              to={`/students/${selected.id}/visits/new`}
              className="inline-block rounded bg-red-600 px-4 py-2 text-white"
            >
              Start visit
            </Link>

            <div className="flex items-start gap-6">
              <PhotoUpload
                studentId={selected.id}
                photoUrl={selected.photo_url}
                onUploaded={(photo_url) => setSelected({ ...selected, photo_url })}
              />
              <div className="flex-1">
                <StudentProfileForm student={selected} onSaved={setSelected} />
              </div>
            </div>

            {contactCount < MIN_EMERGENCY_CONTACTS && (
              <p className="text-sm text-amber-700">
                Profile incomplete: {MIN_EMERGENCY_CONTACTS - contactCount} more emergency
                contact(s) needed.
              </p>
            )}
            <EmergencyContactsForm
              studentId={selected.id}
              onContactsChange={handleContactsChange}
            />

            <MedicalAlertForm studentId={selected.id} onSaved={() => void refetchAlerts()} />

            <MedicationsList studentId={selected.id} />

            <CommunicationLogForm studentId={selected.id} />

            <VisitHistoryList studentId={selected.id} />
          </>
        )}

        {!selected && !creatingNew && (
          <p className="text-gray-500">Select a student or create a new one.</p>
        )}
      </div>
    </div>
  )
}
