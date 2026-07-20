import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ReportFilterValues, VisitFrequencyRow } from '../../types/report'

/** FR-017: nurse's full-detail visit-frequency report, via the read-audited RPC. */
export function useVisitFrequencyReport(filters: ReportFilterValues) {
  const [rows, setRows] = useState<VisitFrequencyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .rpc('report_visit_frequency', {
        p_date_from: filters.date_from,
        p_date_to: filters.date_to,
        p_grade: filters.grade,
        p_homeroom: filters.homeroom,
        p_chief_complaint: filters.chief_complaint,
        p_disposition: filters.disposition,
      })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setRows((data ?? []) as VisitFrequencyRow[])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filters])

  return { rows, loading, error }
}
