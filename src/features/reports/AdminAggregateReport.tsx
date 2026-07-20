import { useAdminAggregateReport } from './useAdminAggregateReport'
import type { ReportFilterValues } from '../../types/report'

interface AdminAggregateReportProps {
  filters: Pick<ReportFilterValues, 'grade' | 'chief_complaint'>
}

/** FR-018: aggregate-only equivalent — no student names, IDs, or notes anywhere. */
export function AdminAggregateReport({ filters }: AdminAggregateReportProps) {
  const { visitSummary, immunizationGaps, loading, error } = useAdminAggregateReport(filters)

  if (loading) return <p className="text-sm text-gray-500">Loading aggregate report…</p>
  if (error) return <p className="text-sm text-red-600">Failed to load report: {error}</p>

  return (
    <div className="space-y-4 rounded border p-4" data-testid="admin-aggregate-report">
      <h3 className="font-semibold">Visit &amp; immunization summary (admin — aggregate only)</h3>

      <div>
        <h4 className="text-sm font-semibold">Visit summary by day / complaint / grade</h4>
        <ul className="text-sm">
          {visitSummary.map((row) => (
            <li key={`${row.visit_date}-${row.chief_complaint}-${row.grade}`}>
              {row.visit_date.slice(0, 10)} — {row.chief_complaint} — grade {row.grade ?? '—'}:{' '}
              {row.visit_count} visit(s) across {row.distinct_student_count} students
            </li>
          ))}
          {visitSummary.length === 0 && (
            <li className="text-gray-500">No groups meet the minimum reporting size.</li>
          )}
        </ul>
      </div>

      <div>
        <h4 className="text-sm font-semibold">Immunization gaps by grade</h4>
        <ul className="text-sm">
          {immunizationGaps.map((row) => (
            <li key={row.grade}>
              Grade {row.grade ?? '—'}: {row.overdue_or_missing_count} of {row.total_students}{' '}
              overdue or missing
            </li>
          ))}
          {immunizationGaps.length === 0 && (
            <li className="text-gray-500">No groups meet the minimum reporting size.</li>
          )}
        </ul>
      </div>
    </div>
  )
}
