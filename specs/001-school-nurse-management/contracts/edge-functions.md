# Contract: Supabase Edge Functions

## generate-report-pdf

**Request** (authenticated, caller's role determines what data is reachable via RLS):

```json
{
  "report_type": "visit_frequency" | "immunization_status",
  "audience": "nurse" | "admin",
  "filters": {
    "date_from": "2026-01-01",
    "date_to": "2026-06-01",
    "grade": "string?",
    "homeroom": "string?",
    "chief_complaint": "string?",
    "disposition": "string?"
  }
}
```

- If `audience = "admin"`, the function MUST read only from the admin aggregate
  views/functions (`admin_visit_summary`, `admin_immunization_gaps`) — never from base
  clinical tables — regardless of the caller's actual role, so a nurse previewing the
  admin variant sees exactly what an admin would see.
- If the caller's role is `admin`, `audience` MUST be forced to `"admin"` server-side
  (ignore/reject a client-supplied `"nurse"` value).

**Response**:

```json
{ "report_id": "uuid", "pdf_url": "string" }
```

**Errors**: 403 if `audience = "nurse"` requested by a caller whose role is `admin`.

## send-report-email

**Request**:

```json
{ "report_id": "uuid", "recipient_email": "string" }
```

- Looks up the `reports` row's `audience` and sends the matching PDF (`pdf_url`) as a
  Resend attachment — never re-derives or substitutes a different variant.

**Response**: `{ "sent": true }` or a 4xx/5xx with an error the client surfaces as a
sync-style failure notification (Constitution Principle III's "no silent failure"
applies to email delivery too, per FR-020's completion expectation).

## generate-send-home-notice

**Request** (authenticated; caller's role must be `nurse` or `super_admin` — `admin` is
rejected outright, since this function reads individual student/visit data and the FERPA
boundary means `admin` must never reach it):

```json
{ "visit_id": "uuid", "recipient_email": "string?" }
```

- The function looks up the visit via `get_visit()` (the same read-audited RPC path the
  client uses — see `contracts/rls-policies.md`), and 403s if the caller's role isn't
  `nurse`/`super_admin`.
- **Errors**: 404 if `visit_id` doesn't resolve; 422 if the visit's `disposition` is not
  `'sent_home'` (a notice may only be generated for a sent-home visit, per FR-016).
- Builds a one-page PDF containing: student name, visit date/time, reason (chief
  complaint + assessment), and the recording nurse's identifier (nurse's auth email —
  no separate nurse display-name field exists in the schema yet, per data-model.md).
  Uses `pdf-lib` rather than `@react-pdf/renderer` — the same Deno-runtime risk flagged
  in research.md §6 for `generate-report-pdf` applies here too, and a single static-layout
  page has no need for React's component model, so there's no reason to take on the
  Node-compat risk for this function. Uses the platform's auto-injected
  `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` — no custom secret
  needed for Supabase access itself (the `SUPABASE_` prefix is reserved and cannot be
  set via `supabase secrets set`).
- Uploads the PDF to the private `send-home-notices` Storage bucket and inserts a row
  into `send_home_notices` (`visit_id`, `pdf_url`, `generated_at`, `emailed_to`).
- If `recipient_email` is provided, sends the PDF as a Resend attachment and sets
  `emailed_to` accordingly; an email failure does not roll back the notice
  row — it surfaces as a non-fatal `emailed: false` in the response so the client can
  show a "notice generated, email failed" state rather than silently losing the
  generated notice (Constitution Principle III's "no silent failure" applies to this
  delivery path the same way it does for `send-report-email`).

**Response**:

```json
{ "notice_id": "uuid", "pdf_url": "string", "emailed": "boolean" }
```

## outbreak-alert-notify (invoked by DB trigger, not called directly by clients)

**Trigger**: `AFTER INSERT` on `visits`, via the counting function described in
research.md §7.

**Payload to admins** (email body, no client-facing HTTP contract):

```json
{ "complaint_type": "string", "visit_count": "integer", "window_start": "timestamptz", "window_end": "timestamptz" }
```

No student identifiers are included, by construction — the payload is built entirely
from `outbreak_alerts` columns.
