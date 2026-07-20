import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { MedicalAlert } from '../../types/student'

/**
 * Medical alerts are read-audited (Constitution Principle II) — all reads MUST go
 * through the list_medical_alerts() RPC, not a direct table select (see
 * supabase/migrations/0015_rls_policies.sql and 0018_read_audit_rpcs.sql).
 */
export function useMedicalAlerts(studentId: string | undefined) {
  const [alerts, setAlerts] = useState<MedicalAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!studentId) {
      setAlerts([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase.rpc('list_medical_alerts', { p_student_id: studentId })
    if (error) setError(error.message)
    else setAlerts((data ?? []) as MedicalAlert[])
    setLoading(false)
  }, [studentId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { alerts, loading, error, refetch }
}
