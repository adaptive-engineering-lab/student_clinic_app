# Quickstart: School Nurse Management System

## Prerequisites

- Node 20+, Supabase CLI, Docker (for local Supabase)
- `.env` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RESEND_API_KEY` (see repo root `.env`)

## Setup

```bash
supabase start                       # local Postgres/Auth/Storage/Edge Functions
supabase db reset                    # applies all migrations in supabase/migrations/
npm install
npm run dev                          # Vite dev server
```

Seed three test users (one per role) via Supabase Auth locally, then assign roles per
`contracts/rls-policies.md`.

## Validating each user story end-to-end

1. **Student profiles (US1)**: Create a student with demographics + photo; add only 1
   emergency contact and confirm save is blocked; add a 2nd contact and confirm it
   saves. Add a `severe` allergy and confirm the red banner renders on the profile.

2. **Visit logging, alerts-first (US2)**: Start a new visit for the student from step 1;
   confirm the alert banner renders before the rest of the form. Attempt to save without
   a disposition — confirm it's blocked. Set disposition, save. Re-open and edit the
   same visit (should succeed, same day). Manually backdate `visited_at` in a test
   fixture to yesterday and confirm edit is now rejected.

3. **Medications (US3)**: Add a medication with `parent_consent_on_file = false`; confirm
   it does not appear in the administration picker on a new visit. Flip consent to
   `true`; confirm it now appears, log an administration, then attempt to edit/delete
   that administration record directly via the API and confirm it's rejected.

4. **Communications (US4)**: Save a visit with `parent_contacted = true` and confirm a
   `communication_log` row is created. Set disposition to `sent_home` and generate the
   send-home notice; confirm a PDF is retrievable and linked to the visit.

5. **Reports & the admin boundary (US5)**: As `nurse`, generate a visit-frequency report
   for the test data and confirm student names appear in the top-10 list. As `admin`,
   generate the same report and confirm zero student names/IDs appear anywhere in the
   PDF/CSV, and that any group under 5 students is suppressed. Attempt (via direct API
   call, not the UI) to `SELECT` from `students` as `admin` and confirm it returns zero
   rows.

6. **Outbreak alerts (US6)**: Seed 5 visits with the same chief complaint from 5 distinct
   students within 72 hours; confirm an `outbreak_alerts` row is created on the 5th
   insert and an in-app banner appears for `nurse`. Confirm the admin notification
   payload contains no student identifiers.

7. **Offline behavior (Principle III / SC-006)**: In browser devtools, go offline. Create
   a visit and log a medication administration. Confirm both appear queued locally
   (Dexie) and the UI shows a "pending sync" indicator rather than failing. Go back
   online and confirm both sync within 60 seconds and disappear from the pending queue.
   Simulate a sync rejection (e.g., stop the local Supabase instance mid-flush) and
   confirm the nurse sees a persistent failure notification, not silent data loss.

## Automated test entry points

- `npm run test:unit` — Vitest component/unit tests
- `npm run test:integration` — Vitest against local Supabase (RLS policies, triggers,
  offline sync queue logic) — see `contracts/rls-policies.md` for the assertions each
  table needs
- `npm run test:e2e` — Playwright versions of scenarios 1–7 above
