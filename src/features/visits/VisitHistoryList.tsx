import { useVisitHistory } from './useVisitHistory'
import { VisitHistoryNotice } from './VisitHistoryNotice'

interface VisitHistoryListProps {
  studentId: string
}

/** F-3/acceptance scenario 3: lets a nurse revisit a student's past visits and retrieve any linked send-home notice. */
export function VisitHistoryList({ studentId }: VisitHistoryListProps) {
  const { visits, loading, error } = useVisitHistory(studentId)

  if (loading) return <p className="text-sm text-gray-500">Loading visit history…</p>
  if (error)
    return (
      <p role="alert" className="text-sm text-red-600">
        Failed to load visit history: {error}
      </p>
    )
  if (visits.length === 0) return <p className="text-sm text-gray-500">No visits logged yet.</p>

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Visit history</h3>
      {visits.map((visit) => (
        <div key={visit.id} className="rounded border p-3 text-sm">
          <p>
            {new Date(visit.visited_at).toLocaleString()} — {visit.chief_complaint} —{' '}
            {visit.disposition}
          </p>
          <VisitHistoryNotice visit={visit} />
        </div>
      ))}
    </div>
  )
}
