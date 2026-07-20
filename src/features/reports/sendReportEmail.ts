import { supabase } from '../../lib/supabase'

/**
 * Calls the send-report-email Edge Function (contracts/edge-functions.md). Returns
 * false rather than throwing on failure — the caller surfaces this as a visible
 * status, not a silent failure (Constitution Principle III applies to email delivery
 * the same way it does to offline sync).
 */
export async function sendReportEmail(reportId: string, recipientEmail: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke<{ sent: boolean }>('send-report-email', {
    body: { report_id: reportId, recipient_email: recipientEmail },
  })
  if (error) return false
  return data?.sent ?? false
}
