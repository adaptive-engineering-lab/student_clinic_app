import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Report } from '../../types/report'

const BUCKET = 'reports'
const SIGNED_URL_TTL_SECONDS = 60 * 5

/** FR-019 retention: reports has a direct SELECT grant scoped to the caller's own rows. */
export function useReportHistory() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('generated_at', { ascending: false })
    if (error) setError(error.message)
    else setReports((data ?? []) as Report[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  async function getSignedUrl(pdfPath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(pdfPath, SIGNED_URL_TTL_SECONDS)
    if (error) {
      setError(error.message)
      return null
    }
    return data.signedUrl
  }

  return { reports, loading, error, refetch, getSignedUrl }
}
