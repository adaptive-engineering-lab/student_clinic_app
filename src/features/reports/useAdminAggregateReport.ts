import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type {
  AdminImmunizationGapRow,
  AdminVisitSummaryRow,
  ReportFilterValues,
} from '../../types/report'

/**
 * FR-018: reads exclusively from the admin_* aggregate views (never base clinical
 * tables) — the same objects the `admin` role is restricted to at the RLS layer, so a
 * nurse previewing this variant sees exactly what an admin would see.
 */
export function useAdminAggregateReport(
  filters: Pick<ReportFilterValues, 'grade' | 'chief_complaint'>,
) {
  const [visitSummary, setVisitSummary] = useState<AdminVisitSummaryRow[]>([])
  const [immunizationGaps, setImmunizationGaps] = useState<AdminImmunizationGapRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      let visitQuery = supabase.from('admin_visit_summary').select('*')
      if (filters.grade) visitQuery = visitQuery.eq('grade', filters.grade)
      if (filters.chief_complaint)
        visitQuery = visitQuery.eq('chief_complaint', filters.chief_complaint)

      let immunizationQuery = supabase.from('admin_immunization_gaps').select('*')
      if (filters.grade) immunizationQuery = immunizationQuery.eq('grade', filters.grade)

      const [visitResult, immunizationResult] = await Promise.all([visitQuery, immunizationQuery])
      if (cancelled) return

      if (visitResult.error) setError(visitResult.error.message)
      else if (immunizationResult.error) setError(immunizationResult.error.message)
      else {
        setVisitSummary((visitResult.data ?? []) as AdminVisitSummaryRow[])
        setImmunizationGaps((immunizationResult.data ?? []) as AdminImmunizationGapRow[])
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [filters])

  return { visitSummary, immunizationGaps, loading, error }
}
