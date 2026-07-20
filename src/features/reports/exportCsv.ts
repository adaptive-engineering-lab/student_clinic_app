import type { VisitFrequencyRow } from '../../types/report'

const CSV_COLUMNS: (keyof VisitFrequencyRow)[] = [
  'visited_at',
  'student_name',
  'grade',
  'homeroom',
  'chief_complaint',
  'disposition',
]

function csvEscape(value: unknown): string {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** FR-019: nurse-only CSV export of the full-detail visit-frequency report. */
export function exportVisitFrequencyCsv(rows: VisitFrequencyRow[]): void {
  const lines = [
    CSV_COLUMNS.join(','),
    ...rows.map((row) => CSV_COLUMNS.map((col) => csvEscape(row[col])).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `visit-frequency-report-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
