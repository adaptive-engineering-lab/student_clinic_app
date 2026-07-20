import { useVisitFrequencyReport } from './useVisitFrequencyReport'
import type { ReportFilterValues } from '../../types/report'

interface VisitFrequencyReportProps {
  filters: ReportFilterValues
}

/** FR-017: total visits, complaint breakdown, daily trend, top-10 visitors by name. */
export function VisitFrequencyReport({ filters }: VisitFrequencyReportProps) {
  const { rows, loading, error } = useVisitFrequencyReport(filters)

  if (loading) return <p className="text-sm text-gray-500">Loading report…</p>
  if (error) return <p className="text-sm text-red-600">Failed to load report: {error}</p>

  const byComplaint = new Map<string, number>()
  const byDate = new Map<string, number>()
  const byStudent = new Map<string, { name: string; count: number }>()

  for (const row of rows) {
    byComplaint.set(row.chief_complaint, (byComplaint.get(row.chief_complaint) ?? 0) + 1)

    const date = row.visited_at.slice(0, 10)
    byDate.set(date, (byDate.get(date) ?? 0) + 1)

    const existing = byStudent.get(row.student_id)
    byStudent.set(row.student_id, { name: row.student_name, count: (existing?.count ?? 0) + 1 })
  }

  const topStudents = [...byStudent.values()].sort((a, b) => b.count - a.count).slice(0, 10)

  return (
    <div className="space-y-4 rounded border p-4" data-testid="visit-frequency-report">
      <h3 className="font-semibold">Visit frequency report (nurse — full detail)</h3>
      <p className="text-sm text-gray-700">Total visits: {rows.length}</p>

      <div>
        <h4 className="text-sm font-semibold">Complaint breakdown</h4>
        <ul className="text-sm">
          {[...byComplaint.entries()].map(([complaint, count]) => (
            <li key={complaint}>
              {complaint}: {count}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold">Daily trend</h4>
        <ul className="text-sm">
          {[...byDate.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => (
              <li key={date}>
                {date}: {count}
              </li>
            ))}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold">Top 10 visitors</h4>
        <ol className="list-decimal pl-5 text-sm">
          {topStudents.map((s) => (
            <li key={s.name}>
              {s.name} — {s.count} visit{s.count === 1 ? '' : 's'}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
