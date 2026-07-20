import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Medication } from '../../types/medication'

/**
 * Medications are read-audited (Constitution Principle II) — all reads MUST go
 * through the list_medications() RPC, not a direct table select (see
 * supabase/migrations/0015_rls_policies.sql and 0018_read_audit_rpcs.sql).
 */
export function useMedications(studentId: string | undefined) {
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!studentId) {
      setMedications([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase.rpc('list_medications', { p_student_id: studentId })
    if (error) setError(error.message)
    else setMedications((data ?? []) as Medication[])
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { medications, loading, error, refetch }
}
