import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Visit } from '../../types/visit'

/**
 * Visits are read-audited (Constitution Principle II) — all reads MUST go through
 * the list_visits()/get_visit() RPCs, not a direct table select (see
 * supabase/migrations/0015_rls_policies.sql and 0018_read_audit_rpcs.sql).
 */
export function useVisitHistory(studentId: string | undefined) {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!studentId) {
      setVisits([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase.rpc('list_visits', { p_student_id: studentId })
    if (error) setError(error.message)
    else setVisits((data ?? []) as Visit[])
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { visits, loading, error, refetch }
}
