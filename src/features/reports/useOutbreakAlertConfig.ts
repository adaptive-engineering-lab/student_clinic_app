import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { OutbreakAlertConfig } from '../../types/outbreak'

export function useOutbreakAlertConfig() {
  const [config, setConfig] = useState<OutbreakAlertConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('outbreak_alert_config').select('*').maybeSingle()
    if (error) setError(error.message)
    else setConfig(data as OutbreakAlertConfig | null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  async function save(threshold: number, windowHours: number) {
    if (!config) return { ok: false, error: 'No config loaded' }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('outbreak_alert_config')
      .update({
        threshold,
        window_hours: windowHours,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id)
    if (error) return { ok: false, error: error.message }
    await refetch()
    return { ok: true, error: null }
  }

  return { config, loading, error, save }
}
