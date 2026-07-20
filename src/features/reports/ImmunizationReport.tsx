import { useImmunizationReport } from './useImmunizationReport'
import type { ReportFilterValues } from '../../types/report'

interface ImmunizationReportProps {
  filters: Pick<ReportFilterValues, 'grade'>
}

/** FR-028: per-student immunization status, overdue/missing highlighted. */
export function ImmunizationReport({ filters }: ImmunizationReportProps) {
  const { rows, loading, error } = useImmunizationReport(filters)

  if (loading) return <p className="text-sm text-gray-500">Loading immunization report…</p>
  if (error) return <p className="text-sm text-red-600">Failed to load report: {error}</p>

  const overdueCount = rows.filter((r) => r.overdue).length

  return (
    <div className="space-y-2 rounded border p-4" data-testid="immunization-report">
      <h3 className="font-semibold">Immunization status report</h3>
      <p className="text-sm text-gray-700">
        {overdueCount} of {rows.length} record(s) overdue or missing next-due date.
      </p>
      <ul className="text-sm">
        {rows.map((r) => (
          <li key={`${r.student_id}-${r.vaccine_name}`}>
            {r.student_name} — {r.vaccine_name} —{' '}
            {r.overdue ? (
              <span className="text-amber-700">overdue/missing</span>
            ) : (
              <span className="text-green-700">next due {r.next_due_date}</span>
            )}
          </li>
        ))}
        {rows.length === 0 && <li className="text-gray-500">No immunization records.</li>}
      </ul>
    </div>
  )
}
