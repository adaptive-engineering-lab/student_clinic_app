import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ReportAudience, ReportFilterValues, ReportType } from '../../types/report'

const BUCKET = 'reports'
const SIGNED_URL_TTL_SECONDS = 60 * 5

interface GenerateReportResult {
  report_id: string
  pdf_url: string
}

/** Calls the generate-report-pdf Edge Function (contracts/edge-functions.md). */
export function useGenerateReport() {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastReportId, setLastReportId] = useState<string | null>(null)
  const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null)

  async function generate(
    reportType: ReportType,
    audience: ReportAudience,
    filters: ReportFilterValues,
  ): Promise<void> {
    setGenerating(true)
    setError(null)
    const { data, error } = await supabase.functions.invoke<GenerateReportResult>(
      'generate-report-pdf',
      { body: { report_type: reportType, audience, filters } },
    )
    if (error) {
      setGenerating(false)
      setError(error.message)
      return
    }
    setLastReportId(data?.report_id ?? null)

    if (data?.pdf_url) {
      // pdf_url from the function is a bare storage path — sign it from the browser's
      // own client so the URL uses the externally-reachable Supabase URL, not the
      // function's internal one (see generate-report-pdf's comment on this).
      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(data.pdf_url, SIGNED_URL_TTL_SECONDS)
      if (signError) setError(signError.message)
      else setLastPdfUrl(signed.signedUrl)
    }
    setGenerating(false)
  }

  return { generate, generating, error, lastReportId, lastPdfUrl }
}
