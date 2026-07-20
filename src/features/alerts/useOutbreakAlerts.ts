import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { OutbreakAlert } from '../../types/outbreak'

/**
 * outbreak_alerts contains no student identifiers by construction, so — unlike
 * medical alerts/visits/medications — nurses read it via a direct table grant, not a
 * read-audited RPC (contracts/rls-policies.md).
 */
export function useOutbreakAlerts() {
  const [alerts, setAlerts] = useState<OutbreakAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('outbreak_alerts')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setAlerts((data ?? []) as OutbreakAlert[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { alerts, loading, error, refetch }
}
