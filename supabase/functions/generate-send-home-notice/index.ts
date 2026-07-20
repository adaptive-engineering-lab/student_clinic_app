// Deno Edge Function (contracts/edge-functions.md: generate-send-home-notice).
// Uses pdf-lib rather than @react-pdf/renderer — see research.md §6 and this
// function's contract entry for why: a single static-layout page has no need for
// React's component model, so there's no reason to take on @react-pdf/renderer's
// Node-compat risk under Deno for this function.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts } from 'npm:pdf-lib@1.17.1'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

interface RequestBody {
  visit_id: string
  recipient_email?: string
}

interface VisitRow {
  id: string
  student_id: string
  nurse_id: string
  visited_at: string
  chief_complaint: string
  assessment: string | null
  disposition: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function buildNoticePdf(info: {
  studentName: string
  visitedAt: string
  reason: string
  nurseIdentifier: string
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)

  let y = 720
  const draw = (text: string, size = 12, useBold = false) => {
    page.drawText(text, { x: 50, y, size, font: useBold ? boldFont : font })
    y -= size + 12
  }

  draw('Send-Home Notice', 20, true)
  y -= 10
  draw(`Student: ${info.studentName}`)
  draw(`Date/time: ${new Date(info.visitedAt).toLocaleString()}`)
  draw(`Reason: ${info.reason || 'Not specified'}`)
  draw(`Nurse: ${info.nurseIdentifier}`)

  return doc.save()
}

async function sendNoticeEmail(
  recipientEmail: string,
  studentName: string,
  pdfBytes: Uint8Array,
): Promise<boolean> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return false

  let binary = ''
  for (const byte of pdfBytes) binary += String.fromCharCode(byte)
  const base64Pdf = btoa(binary)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'notices@school-nurse.app',
      to: recipientEmail,
      subject: `Send-home notice — ${studentName}`,
      html: '<p>Please see the attached send-home notice.</p>',
      attachments: [{ filename: 'send-home-notice.pdf', content: base64Pdf }],
    }),
  })
  return response.ok
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
  if (!body.visit_id) return json({ error: 'visit_id_required' }, 400)

  // The SUPABASE_ prefix is reserved by the platform — SUPABASE_URL, _ANON_KEY, and
  // _SERVICE_ROLE_KEY are auto-injected into every Edge Function (locally and in
  // production) and cannot be overridden via `supabase secrets set`/--env-file, so
  // no custom secret is needed for these three.
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Forwards the caller's JWT so RLS/RPC role checks apply as the calling nurse, not
  // as a privileged service — the FERPA boundary must hold even inside this function.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // get_visit() (0018_read_audit_rpcs.sql) enforces nurse/super_admin and audit-logs
  // the read — an admin caller gets insufficient_privilege here, by construction.
  const { data: visits, error: visitError } = await userClient.rpc('get_visit', {
    p_visit_id: body.visit_id,
  })
  if (visitError) {
    const status = visitError.code === '42501' ? 403 : 404
    return json({ error: visitError.message }, status)
  }
  const visit = (visits as VisitRow[] | null)?.[0]
  if (!visit) return json({ error: 'visit_not_found' }, 404)
  if (visit.disposition !== 'sent_home') return json({ error: 'visit_not_sent_home' }, 422)

  const { data: student, error: studentError } = await userClient
    .from('students')
    .select('first_name, last_name')
    .eq('id', visit.student_id)
    .single()
  if (studentError || !student) return json({ error: 'student_not_found' }, 404)

  // Service-role lookup only for the nurse's email — no display-name field exists on
  // auth.users/user_roles yet, so the email is what's available to print (see this
  // function's contract entry in contracts/edge-functions.md).
  const adminClient = createClient(supabaseUrl, secretKey)
  const { data: nurseUser } = await adminClient.auth.admin.getUserById(visit.nurse_id)
  const nurseIdentifier = nurseUser?.user?.email ?? visit.nurse_id

  const studentName = `${student.first_name} ${student.last_name}`
  const pdfBytes = await buildNoticePdf({
    studentName,
    visitedAt: visit.visited_at,
    reason: [visit.chief_complaint, visit.assessment].filter(Boolean).join(' — '),
    nurseIdentifier,
  })

  const noticeId = crypto.randomUUID()
  const storagePath = `${visit.id}/${noticeId}.pdf`
  const { error: uploadError } = await userClient.storage
    .from('send-home-notices')
    .upload(storagePath, pdfBytes, { contentType: 'application/pdf' })
  if (uploadError) return json({ error: uploadError.message }, 500)

  const emailed = body.recipient_email
    ? await sendNoticeEmail(body.recipient_email, studentName, pdfBytes)
    : false

  const { error: insertError } = await userClient.from('send_home_notices').insert({
    id: noticeId,
    visit_id: visit.id,
    pdf_url: storagePath,
    emailed_to: emailed ? body.recipient_email : null,
  })
  if (insertError) return json({ error: insertError.message }, 500)

  return json({ notice_id: noticeId, pdf_url: storagePath, emailed })
})
