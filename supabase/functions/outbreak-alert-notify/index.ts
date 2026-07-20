// Deno Edge Function (contracts/edge-functions.md: outbreak-alert-notify).
// Invoked by the visits_outbreak_check trigger (0025_outbreak_trigger.sql) via
// pg_net — not a client-facing HTTP contract. The payload is built entirely from
// outbreak_alerts columns, so it contains no student identifiers by construction.
import { createClient } from 'npm:@supabase/supabase-js@2'

interface RequestBody {
  complaint_type: string
  visit_count: number
  window_start: string
  window_end: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Reads the (Kong-verified, in a normal deploy) JWT payload to confirm the caller is
 * the service role, not a stray client call — this function has no per-request
 * authorization model of its own beyond "only the DB trigger should ever call this".
 */
function isServiceRoleToken(authHeader: string): boolean {
  const token = authHeader.replace(/^Bearer\s+/i, '')
  const payloadSegment = token.split('.')[1]
  if (!payloadSegment) return false
  try {
    const payload = JSON.parse(atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/')))
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !isServiceRoleToken(authHeader)) {
    return json({ error: 'forbidden' }, 403)
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  if (!body.complaint_type || !body.visit_count) {
    return json({ error: 'complaint_type_and_visit_count_required' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const serviceClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: adminRoleRows, error: roleError } = await serviceClient
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin')
  if (roleError) return json({ error: roleError.message }, 500)

  const adminIds = new Set((adminRoleRows ?? []).map((r) => r.user_id as string))
  if (adminIds.size === 0) return json({ notified: 0 })

  const { data: usersPage, error: usersError } = await serviceClient.auth.admin.listUsers()
  if (usersError) return json({ error: usersError.message }, 500)

  const adminEmails = usersPage.users
    .filter((u) => adminIds.has(u.id) && u.email)
    .map((u) => u.email as string)

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey || adminEmails.length === 0) {
    return json({ notified: 0, reason: !resendKey ? 'email_not_configured' : 'no_admin_recipients' })
  }

  // No student identifiers anywhere in this payload — only aggregate counts and the
  // window, matching outbreak_alerts' own columns exactly.
  const html = `<p>An outbreak alert has been raised.</p>
    <ul>
      <li>Complaint: ${body.complaint_type}</li>
      <li>Visit count: ${body.visit_count}</li>
      <li>Window: ${body.window_start} to ${body.window_end}</li>
    </ul>`

  let notified = 0
  for (const to of adminEmails) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'alerts@school-nurse.app',
        to,
        subject: `Outbreak alert: ${body.complaint_type}`,
        html,
      }),
    })
    if (response.ok) notified++
  }

  return json({ notified })
})
