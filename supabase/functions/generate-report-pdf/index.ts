// Deno Edge Function (contracts/edge-functions.md: generate-report-pdf).
// Uses pdf-lib — see generate-send-home-notice's header comment and research.md §6
// for why (Deno Node-compat risk with @react-pdf/renderer, no need for it on a
// static-layout report page).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts } from 'npm:pdf-lib@1.17.1'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

type ReportType = 'visit_frequency' | 'immunization_status'
type Audience = 'nurse' | 'admin'

interface RequestBody {
  report_type: ReportType
  audience?: Audience
  filters?: {
    date_from?: string | null
    date_to?: string | null
    grade?: string | null
    homeroom?: string | null
    chief_complaint?: string | null
    disposition?: string | null
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function buildPdf(title: string, lines: string[]): Promise<Uint8Array> {
  return (async () => {
    const doc = await PDFDocument.create()
    let page = doc.addPage([612, 792])
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)

    let y = 740
    page.drawText(title, { x: 50, y, size: 18, font: boldFont })
    y -= 30

    for (const line of lines) {
      if (y < 50) {
        page = doc.addPage([612, 792])
        y = 740
      }
      page.drawText(line, { x: 50, y, size: 10, font })
      y -= 16
    }

    return doc.save()
  })()
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
  if (!body.report_type) return json({ error: 'report_type_required' }, 400)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Reads happen through the caller's own JWT — RLS/RPC role checks apply exactly as
  // they would for a direct client call, so the FERPA boundary can't be bypassed by
  // this function existing.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()
  if (userError || !user) return json({ error: 'unauthorized' }, 401)

  const { data: roleRow } = await userClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()
  const callerRole = roleRow?.role as 'nurse' | 'admin' | 'super_admin' | undefined
  if (!callerRole) return json({ error: 'no_role_assigned' }, 403)

  // An admin caller may only ever produce the aggregate variant — explicitly
  // requesting "nurse" is rejected rather than silently rewritten, per this
  // function's contract entry.
  if (callerRole === 'admin' && body.audience === 'nurse') {
    return json({ error: 'forbidden_audience' }, 403)
  }
  const audience: Audience = callerRole === 'admin' ? 'admin' : (body.audience ?? 'nurse')

  const filters = body.filters ?? {}
  const title =
    body.report_type === 'visit_frequency' ? 'Visit Frequency Report' : 'Immunization Status Report'
  let lines: string[]

  if (audience === 'admin') {
    if (body.report_type === 'visit_frequency') {
      let query = userClient.from('admin_visit_summary').select('*')
      if (filters.grade) query = query.eq('grade', filters.grade)
      if (filters.chief_complaint) query = query.eq('chief_complaint', filters.chief_complaint)
      const { data, error } = await query
      if (error) return json({ error: error.message }, 500)
      lines = (data ?? []).map(
        (r) =>
          `${String(r.visit_date).slice(0, 10)} — ${r.chief_complaint} — grade ${r.grade ?? '—'}: ` +
          `${r.visit_count} visit(s) across ${r.distinct_student_count} students`,
      )
    } else {
      let query = userClient.from('admin_immunization_gaps').select('*')
      if (filters.grade) query = query.eq('grade', filters.grade)
      const { data, error } = await query
      if (error) return json({ error: error.message }, 500)
      lines = (data ?? []).map(
        (r) =>
          `Grade ${r.grade ?? '—'}: ${r.overdue_or_missing_count} of ${r.total_students} overdue or missing`,
      )
    }
  } else {
    if (body.report_type === 'visit_frequency') {
      const { data, error } = await userClient.rpc('report_visit_frequency', {
        p_date_from: filters.date_from ?? null,
        p_date_to: filters.date_to ?? null,
        p_grade: filters.grade ?? null,
        p_homeroom: filters.homeroom ?? null,
        p_chief_complaint: filters.chief_complaint ?? null,
        p_disposition: filters.disposition ?? null,
      })
      if (error) return json({ error: error.message }, 500)
      lines = (data ?? []).map(
        (r: {
          visited_at: string
          student_name: string
          chief_complaint: string
          disposition: string
        }) =>
          `${r.visited_at.slice(0, 10)} — ${r.student_name} — ${r.chief_complaint} — ${r.disposition}`,
      )
    } else {
      const { data, error } = await userClient
        .from('immunizations')
        .select('vaccine_name, next_due_date, students(first_name, last_name, grade)')
      if (error) return json({ error: error.message }, 500)
      const today = new Date().toISOString().slice(0, 10)
      lines = (
        (data ?? []) as unknown as Array<{
          vaccine_name: string
          next_due_date: string | null
          students: { first_name: string; last_name: string; grade: string | null } | null
        }>
      )
        .filter((r) => !filters.grade || r.students?.grade === filters.grade)
        .map((r) => {
          const overdue = !r.next_due_date || r.next_due_date < today
          const name = r.students ? `${r.students.first_name} ${r.students.last_name}` : 'Unknown'
          return `${name} — ${r.vaccine_name} — ${overdue ? 'overdue/missing' : `next due ${r.next_due_date}`}`
        })
    }
  }

  const pdfBytes = await buildPdf(title, lines.length ? lines : ['No matching records.'])

  // The `reports` table's admin RLS policy is SELECT-only (own admin-audience rows) —
  // admin has no direct INSERT grant, per contracts/rls-policies.md. The service-role
  // client performs this write on the caller's behalf for both roles, uniformly;
  // `generated_by` is still set from the verified caller id, so no one can write a
  // report attributed to someone else.
  const serviceClient = createClient(supabaseUrl, serviceRoleKey)

  const reportId = crypto.randomUUID()
  const storagePath = `${audience}/${reportId}.pdf`
  const { error: uploadError } = await serviceClient.storage
    .from('reports')
    .upload(storagePath, pdfBytes, { contentType: 'application/pdf' })
  if (uploadError) return json({ error: uploadError.message }, 500)

  const { error: insertError } = await serviceClient.from('reports').insert({
    id: reportId,
    generated_by: user.id,
    report_type: body.report_type,
    audience,
    filters,
    pdf_url: storagePath,
  })
  if (insertError) return json({ error: insertError.message }, 500)

  // Returns the bare storage path, not a signed URL — this function's internal
  // SUPABASE_URL is the Docker-internal host (kong:8000) in local dev, which the
  // browser can't reach. The client generates its own signed URL from the path
  // (same pattern as generate-send-home-notice/useSendHomeNotice), using its own
  // correctly-configured, externally-reachable Supabase URL.
  return json({ report_id: reportId, pdf_url: storagePath })
})
