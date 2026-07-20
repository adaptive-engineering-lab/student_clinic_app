import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ImmunizationGapRow, ReportFilterValues } from '../../types/report'

interface ImmunizationRow {
  student_id: string
  vaccine_name: string
  next_due_date: string | null
  students: { first_name: string; last_name: string; grade: string | null } | null
}

/** FR-028: immunization-status report — both immunizations and students are directly nurse-readable. */
export function useImmunizationReport(filters: Pick<ReportFilterValues, 'grade'>) {
  const [rows, setRows] = useState<ImmunizationGapRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('immunizations')
      .select('student_id, vaccine_name, next_due_date, students(first_name, last_name, grade)')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setError(error.message)
          setLoading(false)
          return
        }
        const today = new Date().toISOString().slice(0, 10)
        const mapped = ((data ?? []) as unknown as ImmunizationRow[])
          .filter((r) => !filters.grade || r.students?.grade === filters.grade)
          .map((r) => ({
            student_id: r.student_id,
            student_name: r.students ? `${r.students.first_name} ${r.students.last_name}` : '',
            grade: r.students?.grade ?? null,
            vaccine_name: r.vaccine_name,
            next_due_date: r.next_due_date,
            overdue: !r.next_due_date || r.next_due_date < today,
          }))
        setRows(mapped)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filters])

  return { rows, loading, error }
}
