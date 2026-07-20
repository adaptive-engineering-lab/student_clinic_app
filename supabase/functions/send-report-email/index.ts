// Deno Edge Function (contracts/edge-functions.md: send-report-email).
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

interface RequestBody {
  report_id: string
  recipient_email: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'unauthorized' }, 401)

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  if (!body.report_id || !body.recipient_email) {
    return json({ error: 'report_id_and_recipient_email_required' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // reports' RLS (0015_rls_policies.sql) already scopes SELECT to "own rows" for both
  // nurse and admin — reading through the caller's own JWT is what "looks up the
  // report's audience and sends the matching PDF" (this function's contract) means in
  // practice: a caller can never email a report they didn't generate.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: report, error: reportError } = await userClient
    .from('reports')
    .select('id, audience, pdf_url')
    .eq('id', body.report_id)
    .maybeSingle()
  if (reportError) return json({ error: reportError.message }, 500)
  if (!report || !report.pdf_url) return json({ error: 'report_not_found' }, 404)

  // Service-role client only to read the PDF bytes back out of private storage for
  // attachment — the access-control decision already happened above via RLS.
  const serviceClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: pdfBlob, error: downloadError } = await serviceClient.storage
    .from('reports')
    .download(report.pdf_url)
  if (downloadError) return json({ error: downloadError.message }, 500)

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return json({ sent: false, error: 'email_not_configured' }, 200)

  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer())
  let binary = ''
  for (const byte of pdfBytes) binary += String.fromCharCode(byte)
  const base64Pdf = btoa(binary)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'reports@school-nurse.app',
      to: body.recipient_email,
      subject: `School nurse report (${report.audience})`,
      html: '<p>Please see the attached report.</p>',
      attachments: [{ filename: 'report.pdf', content: base64Pdf }],
    }),
  })

  if (!response.ok) return json({ sent: false, error: 'email_delivery_failed' }, 502)
  return json({ sent: true })
})
