import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AlertBanner } from '../alerts/AlertBanner'
import { useMedicalAlerts } from '../alerts/useMedicalAlerts'
import { VisitForm } from './VisitForm'
import type { Student } from '../../types/student'

/**
 * F-2.3/FR-005: the alert banner MUST render before any other visit content. This
 * component fetches alerts first and only mounts VisitForm once that fetch settles,
 * so the banner is never a layout afterthought below the form.
 */
export function NewVisitPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const navigate = useNavigate()
  const [student, setStudent] = useState<Student | null>(null)
  const { alerts, loading: alertsLoading } = useMedicalAlerts(studentId)

  useEffect(() => {
    if (!studentId) return
    supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single()
      .then(({ data }) => setStudent(data as Student))
  }, [studentId])

  if (!studentId) return <p className="text-red-600">No student selected.</p>

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-lg font-semibold">
        New visit {student ? `— ${student.first_name} ${student.last_name}` : ''}
      </h1>

      {alertsLoading ? (
        <p className="text-sm text-gray-500">Loading alerts…</p>
      ) : (
        <AlertBanner alerts={alerts} />
      )}

      <VisitForm studentId={studentId} onSaved={() => navigate('/students')} />
    </div>
  )
}
