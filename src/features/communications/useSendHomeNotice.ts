import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { SendHomeNotice } from '../../types/communication'

const BUCKET = 'send-home-notices'
const SIGNED_URL_TTL_SECONDS = 60 * 5

interface GenerateResult {
  notice_id: string
  pdf_url: string
  emailed: boolean
}

/**
 * Looks up (send_home_notices has a direct SELECT grant, per contracts/rls-policies.md
 * — no read-audit RPC needed here) and generates send-home notices for a visit
 * (contracts/edge-functions.md: generate-send-home-notice).
 */
export function useSendHomeNotice(visitId: string) {
  const [notice, setNotice] = useState<SendHomeNotice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('send_home_notices')
      .select('*')
      .eq('visit_id', visitId)
      .maybeSingle()
    if (error) setError(error.message)
    else setNotice(data as SendHomeNotice | null)
    setLoading(false)
  }, [visitId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  async function generate(recipientEmail?: string): Promise<boolean> {
    setGenerating(true)
    setError(null)
    const { data, error } = await supabase.functions.invoke<GenerateResult>(
      'generate-send-home-notice',
      { body: { visit_id: visitId, recipient_email: recipientEmail || undefined } },
    )
    setGenerating(false)
    if (error) {
      setError(error.message)
      return false
    }
    await refetch()
    return data?.emailed ?? false
  }

  async function getSignedUrl(pdfUrl: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(pdfUrl, SIGNED_URL_TTL_SECONDS)
    if (error) {
      setError(error.message)
      return null
    }
    return data.signedUrl
  }

  return { notice, loading, error, generating, generate, getSignedUrl, refetch }
}
