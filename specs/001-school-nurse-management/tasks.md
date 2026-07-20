---

description: "Task list for School Nurse Management System"
---

# Tasks: School Nurse Management System

**Input**: Design documents from `/specs/001-school-nurse-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included — the spec's success criteria (SC-003, SC-004, SC-006, SC-007) and
the constitution's Development Workflow gate require automated proof of the RLS
boundary, append-only enforcement, and offline sync behavior, so test tasks are not
optional for this feature.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Paths are relative to repo root, matching plan.md's Project Structure

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Initialize Vite + React + TypeScript app at repo root (package.json, tsconfig.json, vite.config.ts, index.html, src/main.tsx)
- [X] T002 [P] Configure Tailwind CSS (tailwind.config.ts, postcss.config.js, src/index.css) — Tailwind v4 uses the `@tailwindcss/vite` plugin + `@import "tailwindcss"` instead of a config file
- [X] T003 [P] Configure `vite-plugin-pwa` (manifest, service worker registration) in vite.config.ts
- [X] T004 [P] Configure ESLint + Prettier (eslint.config.js flat config, .prettierrc.json)
- [X] T005 Initialize Supabase project structure (`supabase init`, supabase/config.toml)
- [X] T006 [P] Create .env.example with VITE_-prefixed frontend vars plus server-only SUPABASE_SECRET_KEY/RESEND_API_KEY (see .env.example comments — real .env needs the VITE_ vars added)
- [X] T007 [P] Configure Vitest + React Testing Library (vitest.config.ts, tests/setup.ts)
- [X] T008 [P] Configure Playwright (playwright.config.ts, tests/e2e/fixtures.ts) — browser binaries installed and verified with a live render check

**Checkpoint**: Toolchain runs (`npm run dev`, `npm run test:unit`) with an empty app shell.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T009 Create `schools` table migration in supabase/migrations/0001_schools.sql
- [X] T010 Create `students` table migration in supabase/migrations/0002_students.sql
- [X] T011 [P] Create `emergency_contacts` table migration in supabase/migrations/0003_emergency_contacts.sql
- [X] T012 [P] Create `medical_alerts` table migration in supabase/migrations/0004_medical_alerts.sql
- [X] T013 Create `visits` table migration in supabase/migrations/0005_visits.sql
- [X] T014 [P] Create `medications` table migration in supabase/migrations/0006_medications.sql
- [X] T015 [P] Create `medication_administrations` table migration (no UPDATE/DELETE grants for any role, per data-model.md) in supabase/migrations/0007_medication_administrations.sql
- [X] T016 [P] Create `communication_log` table migration in supabase/migrations/0008_communication_log.sql
- [X] T017 [P] Create `send_home_notices` table migration in supabase/migrations/0009_send_home_notices.sql
- [X] T018 [P] Create `immunizations` table migration in supabase/migrations/0010_immunizations.sql
- [X] T019 [P] Create `reports` table migration in supabase/migrations/0011_reports.sql
- [X] T020 [P] Create `outbreak_alerts` and `outbreak_alert_config` table migrations in supabase/migrations/0012_outbreak_alerts.sql
- [X] T021 Create `audit_log` table migration (no UPDATE/DELETE grants for any role) in supabase/migrations/0013_audit_log.sql
- [X] T024 Implement role assignment (nurse/admin/super_admin) and an `app_role()` helper function used by RLS policies in supabase/migrations/0014_roles.sql — reordered before T022/T023 (renumbered 0014) since RLS policies depend on this function; also named `app_role()` not `current_role()` because the latter collides with a reserved PostgreSQL keyword
- [X] T022 Implement RLS policies for all tables per contracts/rls-policies.md in supabase/migrations/0015_rls_policies.sql — also revoked default-privilege overgrants (DELETE/TRUNCATE etc. that Supabase's bootstrap grants to `authenticated` on every new table) down to exactly what each table's contract specifies, and tightened `visits`/`medications`/`medical_alerts` to have no direct SELECT grant at all (reads only via the RPCs in T026), which contracts/rls-policies.md didn't originally spell out but the constitution's read-audit requirement demands
- [X] T023 Implement `admin_visit_summary`, `admin_immunization_gaps`, and `admin_outbreak_alert_feed` aggregate views with <5-student suppression (research.md §2) in supabase/migrations/0016_admin_aggregate_views.sql
- [X] T025 Implement `AFTER INSERT/UPDATE` audit triggers for `visits`, `medications`, `medical_alerts` writing to `audit_log` in supabase/migrations/0017_audit_triggers.sql
- [X] T026 Implement `SECURITY DEFINER` read-audit RPC functions (one per audited table) that log to `audit_log` before returning rows, per research.md §4, in supabase/migrations/0018_read_audit_rpcs.sql
- [X] T027 Implement Supabase client wrapper in src/lib/supabase.ts
- [X] T028 Implement Dexie schema for the offline write queue in src/lib/offline/db.ts
- [X] T029 Implement offline sync flush logic (chronological order, per-item failure notification) in src/lib/offline/sync.ts
- [X] T030 Implement client-side 30-minute inactivity timeout and sign-out in src/lib/auth/session.ts
- [X] T031 Implement app shell, routing, and role-based route guards in src/routes/index.tsx, src/routes/AppLayout.tsx, src/routes/RequireRole.tsx

**Verification performed**: `supabase db reset` applied all 18 migrations cleanly. Confirmed
via direct psql session with fake nurse/admin JWT claims: (1) admin role returns 0 rows on
direct `SELECT` from `students`; (2) admin can query `admin_visit_summary` with no error;
(3) nurse's direct `SELECT * FROM visits` is rejected with `permission denied` (proving reads
must go through `list_visits()`/`get_visit()`); (4) `information_schema.role_table_grants`
confirms every table's grants now match contracts/rls-policies.md exactly, with the
Supabase-bootstrap default-privilege overgrant (DELETE/TRUNCATE/etc.) removed. `npm run build`,
`npm run lint`, and `npm run format:check` all pass; a live Playwright render of `/` correctly
redirects to `/login` and renders the sign-in form with zero console errors.

**Checkpoint**: Schema, RLS, audit trail, offline queue, and auth session scaffolding all exist — user stories can now proceed.

---

## Phase 3: User Story 1 - Maintain student health profiles (Priority: P1) 🎯 MVP

**Goal**: Nurses can create/search a student roster with demographics, photo, emergency
contacts, and medical alerts, with the critical-alert banner rendering correctly.

**Independent Test**: Create a student profile with demographics, a photo, two emergency
contacts, and a severe allergy; confirm the profile is searchable and the alert banner
renders — with no visit ever logged.

### Tests for User Story 1

- [X] T032 [P] [US1] Integration test: profile save blocked with <2 emergency contacts in tests/integration/student-profile.test.tsx
- [X] T033 [P] [US1] E2E test: create student, add severe allergy, confirm banner renders in tests/e2e/student-profile.spec.ts — required fixing supabase/seed.sql (GoTrue rejects NULL confirmation_token/etc.) and adding a missing post-login redirect in LoginPage.tsx (it never navigated after a successful sign-in)

### Implementation for User Story 1

- [X] T034 [P] [US1] Create Student/EmergencyContact/MedicalAlert TS types in src/types/student.ts
- [X] T035 [US1] Implement student roster list + search in src/features/students/StudentRoster.tsx
- [X] T036 [US1] Implement student profile create/edit form (demographics, FR-001) in src/features/students/StudentProfileForm.tsx
- [X] T037 [US1] Implement photo upload to Supabase Storage in src/features/students/PhotoUpload.tsx (added migration 0019_storage_student_photos.sql for the bucket + storage RLS, not originally itemized as its own task)
- [X] T038 [US1] Implement emergency contacts sub-form with min-2 validation (FR-003) in src/features/students/EmergencyContactsForm.tsx
- [X] T039 [US1] Implement medical alert sub-form (allergy/condition, severity, epipen/inhaler location, FR-004/FR-006) in src/features/alerts/MedicalAlertForm.tsx
- [X] T040 [US1] Implement AlertBanner component driven by severity/requires_immediate_action (FR-005) in src/features/alerts/AlertBanner.tsx
- [X] T041 [US1] Implement student profile page wiring roster, form, and AlertBanner together in src/features/students/StudentProfilePage.tsx

**Verification performed**: Full flow driven live via Playwright (interactive + headless) against
the real local Supabase stack — created a student, added a severe allergy, confirmed the
banner renders. `npm run build`/`lint`/`format:check` pass; integration + e2e tests pass.

**Checkpoint**: User Story 1 is fully functional and independently testable/demoable.

---

## Phase 4: User Story 2 - Record a clinic visit safely, alerts-first (Priority: P1) 🎯 MVP

**Goal**: Nurses can log a full clinic visit with the alert banner rendering before any
other content, and disposition required before save.

**Independent Test**: Open a new visit for a student with a severe allergy; confirm the
banner renders first; complete the form; confirm save is blocked without a disposition.

### Tests for User Story 2

- [X] T042 [P] [US2] Integration test: visit save blocked without disposition (FR-010) in tests/integration/visit-disposition.test.tsx
- [X] T043 [P] [US2] Integration test: same-day edit allowed, next-day edit rejected by RLS (FR-007) in tests/integration/visit-edit-window.test.ts — this surfaced a real bug: PostgreSQL requires SELECT privilege on any column referenced in an `UPDATE ... WHERE` clause even under `Prefer: return=minimal`, so the no-SELECT-grant design for `visits` (read-audit) silently broke direct updates. Fixed with a new `update_visit()` SECURITY DEFINER RPC (supabase/migrations/0020_update_visit_rpc.sql) that enforces the same-day/own-nurse check explicitly (SECURITY DEFINER bypasses RLS) and is now what src/lib/offline/sync.ts calls for visit updates instead of a direct table update
- [X] T044 [P] [US2] E2E test: alert-first render then full visit save in tests/e2e/visit-log.spec.ts

### Implementation for User Story 2

- [X] T045 [P] [US2] Create Visit TS types in src/types/visit.ts
- [X] T046 [US2] Implement new-visit page rendering AlertBanner before form content in src/features/visits/NewVisitPage.tsx
- [X] T047 [US2] Implement chief complaint picklist + free-text field (FR-008) in src/features/visits/ChiefComplaintField.tsx
- [X] T048 [US2] Implement optional vitals form with dual C/F temperature display (FR-009) in src/features/visits/VitalsForm.tsx
- [X] T049 [US2] Implement assessment, actions-taken, and required-disposition fields with save-blocking validation (FR-010) in src/features/visits/VisitForm.tsx
- [X] T050 [US2] Implement parent-contacted fields (name/method/time/notes, FR-011) within VisitForm in src/features/visits/ParentContactFields.tsx
- [X] T051 [US2] Wire visit create/update through the offline queue (src/lib/offline) in src/features/visits/useSaveVisit.ts — creation is wired into the UI (VisitForm); the update path exists at the data layer (update_visit RPC + sync.ts) and is tested (T043), but no "edit an existing visit" UI screen was built in this pass — out of scope for what tasks.md's US2 implementation tasks itemized

**Checkpoint**: User Stories 1 AND 2 both work independently — this is the safety-critical MVP.

**Verification performed**: Live Playwright run (interactive + headless) against the real local
Supabase stack — alert banner confirmed to render before the visit form (DOM-order check, not
just co-presence); save blocked and shows an error with no disposition selected; full visit
saves and redirects. `npm run build`/`lint`/`format:check` pass; all 6 integration tests and
both e2e specs pass.

---

## Phase 5: User Story 3 - Administer medications with consent safeguards (Priority: P2)

**Goal**: Nurses can log medication administrations, with consent enforced and the
administration record permanently immutable.

**Independent Test**: Add a medication with consent not on file; confirm it's excluded
from the administration picker; mark consent on file; confirm it now appears and can be
logged; confirm the resulting record cannot be edited or deleted.

### Tests for User Story 3

- [X] T052 [P] [US3] Integration test: medication with consent=false excluded from administration picker (FR-013) in tests/integration/medication-consent.test.tsx
- [X] T053 [P] [US3] Integration test: medication_administrations record rejects UPDATE/DELETE (FR-014) in tests/integration/medication-append-only.test.ts

### Implementation for User Story 3

- [X] T054 [P] [US3] Create Medication/MedicationAdministration TS types in src/types/medication.ts
- [X] T055 [US3] Implement medications-on-file list/form per student (FR-012) in src/features/medications/MedicationsList.tsx
- [X] T056 [US3] Implement administration picker filtering out consent=false/inactive medications (FR-013) in src/features/medications/AdministerMedicationModal.tsx (inline fields within VisitForm rather than a modal dialog — simpler for this MVP, same filtering behavior)
- [X] T057 [US3] Implement insert-only administration RPC call, consent-checked server-side, in src/features/medications/useAdministerMedication.ts — actually queues through the same offline write queue as visits (Constitution Principle III) rather than a direct RPC call, so administrations recorded offline aren't lost; consent is still re-checked server-side by medication_is_administrable()
- [X] T058 [US3] Integrate medication administration into the visit save flow (linked visit_id) in src/features/visits/VisitForm.tsx

**Bugs found and fixed while verifying (not just written blind)**:

- `flushQueue()`'s re-entrancy guard silently *dropped* a flush request that arrived
  while one was already running, instead of queuing a follow-up — meaning a medication
  administration enqueued immediately after its triggering visit (which had just
  kicked off its own flush) could sit stranded until some unrelated future trigger.
  Fixed in src/lib/offline/sync.ts to schedule exactly one rerun after the in-flight
  flush finishes.
- `useSaveVisit` only returned the new visit's id; administrations also need the
  nurse's user id (`administered_by`), so `saveVisit()` now returns
  `{ id, nurseId }` instead of a bare string.

**Verification performed**: Full flow driven live via Playwright against the real local
Supabase stack — added a medication without consent (confirmed excluded from the
administration picker with the correct on-screen label), added a second medication with
consent, administered it during a visit, and confirmed via direct DB query that the
resulting `medication_administrations` row is correctly linked to both the medication
and the visit. All 10 integration tests (including a DB-level append-only check proving
UPDATE/DELETE are rejected with `permission denied` for the recording nurse) and both
e2e specs pass with no regressions; build/lint/format are clean.

**Checkpoint**: User Stories 1–3 all work independently.

---

## Phase 6: User Story 4 - Maintain a parent/guardian communication trail (Priority: P2)

**Goal**: Every parent-contacted or sent-home visit produces a communication log entry,
and sent-home visits can generate a retrievable notice.

**Independent Test**: Mark a visit's disposition as "sent home," generate the send-home
notice, and confirm both a communication log entry and a stored, linked notice exist.

### Tests for User Story 4

- [X] T059 [P] [US4] Integration test: parent_contacted visit auto-creates communication_log entry (FR-015) in tests/integration/communication-log.test.tsx (component-level, mirroring visit-disposition.test.tsx's mocked-queue pattern — `.tsx` not `.ts` since it renders VisitForm; also required adding the previously-missing `outcome` field to ParentContactFields/parent_contact_log, which FR-015 requires but US2's implementation hadn't captured)
- [X] T060 [P] [US4] E2E test: sent-home visit generates a retrievable notice (FR-016) in tests/e2e/send-home-notice.spec.ts — required adding a minimal visit-history UI (src/features/visits/useVisitHistory.ts, VisitHistoryList.tsx) since no visit-history screen existed yet from US2 to link the notice from

### Implementation for User Story 4

- [X] T061 [P] [US4] Create CommunicationLogEntry/SendHomeNotice TS types in src/types/communication.ts
- [X] T062 [US4] Implement auto-creation of communication_log entries on parent-contacted visit save (FR-015) in src/features/communications/useLogParentContact.ts — queues through the same offline write path as visits (Constitution Principle III); wired into VisitForm's save flow
- [X] T063 [US4] Implement standalone communication log entry form from the student profile in src/features/communications/CommunicationLogForm.tsx (reuses useLogParentContact — same underlying write, visit_id null)
- [X] T064 [US4] Implement send-home notice Edge Function (PDF generation + optional email) per contracts/edge-functions.md in supabase/functions/generate-send-home-notice/index.ts — this function wasn't originally documented in the contract, so its request/response shape was drafted there first. Uses `pdf-lib` instead of `@react-pdf/renderer` (documented in the contract entry and research.md §6 — avoids the Deno Node-compat risk for a single static-layout page). Discovered and fixed along the way: the `SUPABASE_` env var prefix is platform-reserved and cannot be set via `supabase secrets set`/`--env-file`, so `.env.example`'s `SUPABASE_SECRET_KEY` could never actually reach an Edge Function — switched to the auto-injected `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` and corrected `.env.example`. Also added migration 0021_storage_send_home_notices.sql (private bucket + RLS, same pattern as 0019's student-photos bucket)
- [X] T065 [US4] Implement send-home notice trigger UI (print/email choice) in src/features/communications/SendHomeNotice.tsx
- [X] T066 [US4] Implement notice retrieval linked from visit history in src/features/visits/VisitHistoryNotice.tsx

**Verification performed**: Live end-to-end against the real local Supabase stack — served
generate-send-home-notice locally (`supabase functions serve`) and curled it directly:
happy path returns a valid PDF (confirmed via `file`/byte inspection) linked in
`send_home_notices`; confirmed 404 for an unknown visit, 422 for a non-sent-home
disposition, and 401 for a missing Authorization header. Full Playwright run (all 3 e2e
specs, including the new send-home-notice.spec.ts) passes; all 12 integration tests
(including the 2 new communication-log tests) pass; `npm run build`/`lint`/`format:check`
are clean.

**Checkpoint**: User Stories 1–4 all work independently.

---

## Phase 7: User Story 5 - Generate reports with the admin aggregate boundary enforced (Priority: P3)

**Goal**: Nurses generate full-detail reports; admins get an aggregate-only equivalent
with zero individual student data, enforced at the database layer.

**Independent Test**: Generate the same report as nurse and as admin; confirm nurse
version includes student names and admin version contains none; confirm direct
`SELECT` against base tables as admin returns zero rows.

### Tests for User Story 5

- [X] T067 [P] [US5] Integration test: admin role returns zero rows on direct SELECT of `students`/`visits`/`medications` (Constitution Principle I) in tests/integration/admin-rls-boundary.test.ts — required adding an `admin@test.local` seed account (supabase/seed.sql), no admin login existed before now. Confirmed the actual failure modes differ per table: `students` returns `[]` (RLS-filtered, table grant exists), `visits`/`medications` return a hard `permission denied` (no table grant at all, RPC-only reads) — both assert correctly
- [X] T068 [P] [US5] Integration test: admin aggregate views suppress groups under 5 students (research.md §2) in tests/integration/admin-aggregate-suppression.test.ts
- [X] T069 [P] [US5] E2E test: nurse vs admin same-filter report comparison (FR-018) in tests/e2e/report-boundary.spec.ts — required fixing two real timing races surfaced by cross-page verification: (1) `saveVisit()` returns before its offline-queue flush actually reaches Supabase, so the test now waits for the `POST /rest/v1/visits` response before navigating away; (2) navigating immediately after clicking "Sign in" cancels the in-flight `signInWithPassword` fetch — now waits for the post-login redirect first

### Implementation for User Story 5

- [X] T070 [P] [US5] Create Report TS types in src/types/report.ts
- [X] T071 [US5] Implement report filter UI (date range, grade, homeroom, complaint, disposition, FR-017) in src/features/reports/ReportFilters.tsx
- [X] T072 [US5] Implement nurse visit-frequency report view including top-10 by name (FR-017) in src/features/reports/VisitFrequencyReport.tsx — `visits` has no direct SELECT grant and the report needs grade/homeroom/name joined in from `students`, so this required a new audit-logged RPC, `report_visit_frequency()` (supabase/migrations/0022_report_rpcs.sql), rather than reusing `list_visits()`
- [X] T073 [US5] Implement immunization-status report view (FR-028) in src/features/reports/ImmunizationReport.tsx — both `immunizations` and `students` are directly nurse-readable, so this reads via a plain PostgREST embedded select, no RPC needed
- [X] T074 [US5] Implement admin aggregate report view reading only from admin_* views (FR-018) in src/features/reports/AdminAggregateReport.tsx — also reused by the nurse-facing "preview admin variant" toggle on ReportsPage.tsx (spec.md acceptance scenario 2)
- [X] T075 [US5] Implement `generate-report-pdf` Edge Function enforcing the audience/role rule per contracts/edge-functions.md in supabase/functions/generate-report-pdf/index.ts — uses `pdf-lib` (same Deno-runtime rationale as generate-send-home-notice). Discovered and fixed along the way: `service_role` bypasses RLS but is **not** exempt from ordinary GRANT/REVOKE checks — it still needs an explicit table grant, and `reports` never had one, so admin's insert (which must go through the service-role client since admin has no direct INSERT grant on `reports`) failed until migration 0024_reports_service_role_grant.sql. Also found that a server-generated signed URL uses the function's *internal* Docker hostname (`kong:8000`) in local dev, unreachable from the browser — switched to returning the bare storage path and signing it client-side instead (matching send-home-notice's existing pattern)
- [X] T076 [US5] Implement nurse-only CSV export (FR-019) in src/features/reports/exportCsv.ts
- [X] T077 [US5] Implement `send-report-email` Edge Function sending the role-appropriate PDF (FR-020) in supabase/functions/send-report-email/index.ts — report lookup happens through the caller's own JWT (RLS already scopes `reports` to "own rows" for both roles), so an admin can't email a report they didn't generate; verified this returns 404 rather than another nurse's data
- [X] T078 [US5] Implement report history tab (FR-019 retention) in src/features/reports/ReportHistory.tsx

**Verification performed**: Live end-to-end against the real local Supabase stack — served both
Edge Functions locally and curled them directly: `generate-report-pdf` confirmed for nurse
(visit_frequency + immunization_status), nurse-preview-of-admin, admin-forced-audience, and
admin-explicitly-requesting-nurse (403); confirmed by byte-inspection that the admin-audience
PDF contains no student names. `send-report-email` confirmed it reads the correct PDF and
correctly reports `email_not_configured` (no real Resend key in this environment) only *after*
successfully downloading the PDF from storage; confirmed admin cannot email nurse's report
(404, RLS-scoped). Full Playwright run (all 4 e2e specs, including the new report-boundary.spec.ts)
passes; all 19 integration tests pass; `npm run build`/`lint`/`format:check` are clean.

**Checkpoint**: User Stories 1–5 all work independently; the FERPA boundary is enforced and tested.

---

## Phase 8: User Story 6 - Receive automatic outbreak/trend alerts (Priority: P3)

**Goal**: The system detects a chief-complaint spike on every visit save and alerts
nurses in-app plus emails a no-names summary to admins.

**Independent Test**: Seed 5 visits with the same chief complaint from 5 distinct
students within 72 hours; confirm an alert is raised on the 5th and the admin
notification contains no student identifiers.

### Tests for User Story 6

- [X] T079 [P] [US6] Integration test: 5th matching visit in rolling window creates an outbreak_alerts row, 4th does not (FR-021) in tests/integration/outbreak-threshold.test.ts
- [X] T080 [P] [US6] Integration test: outbreak notification payload contains no student identifiers in tests/integration/outbreak-notification-privacy.test.ts

### Implementation for User Story 6

- [X] T081 [P] [US6] Create OutbreakAlert/OutbreakAlertConfig TS types in src/types/outbreak.ts
- [X] T082 [US6] Implement outbreak-count Postgres function + `AFTER INSERT` trigger on `visits` (research.md §7) in supabase/migrations/0019_outbreak_trigger.sql
- [X] T083 [US6] Implement in-app outbreak alert banner for nurses (FR-021) in src/features/alerts/OutbreakAlertBanner.tsx
- [X] T084 [US6] Implement outbreak-alert-notify Edge Function invocation to email admins (FR-021) in supabase/functions/outbreak-alert-notify/index.ts
- [X] T085 [US6] Implement super_admin threshold/window configuration UI (FR-022) in src/features/reports/OutbreakConfigForm.tsx

**Checkpoint**: All six user stories are independently functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T086 [P] Configure GitHub Actions CI (lint, typecheck, unit + integration tests) in .github/workflows/ci.yml
- [X] T087 [P] Configure Vercel deployment settings in vercel.json
- [X] T088 Run the full quickstart.md validation end-to-end (all 7 scenarios, including offline)
- [X] T089 [P] Accessibility pass on AlertBanner and all forms (ARIA roles, keyboard navigation)
- [X] T090 Security review confirming deployed RLS policies match contracts/rls-policies.md exactly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–8)**: All depend on Foundational completion. Stories 1 and 2
  are both P1 (MVP) and should be built first; 3 and 4 (P2) next; 5 and 6 (P3) last.
  Story 5 depends on data existing from Stories 1–4 to report on, but its RLS boundary
  and views can be built and tested with seeded data independent of the UI for those
  stories. Story 6 depends on Story 2's `visits` table existing (from Foundational) but
  not on Story 2's UI.
- **Polish (Phase 9)**: Depends on all desired user stories being complete.

### Within Each User Story

- Tests are written first and MUST fail before implementation.
- Types before components/services.
- Data-access hooks/RPCs before the UI that calls them.
- Story complete before moving to the next priority.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- Within Foundational, all per-table migration tasks marked [P] can run in parallel; RLS
  policies (T022) and aggregate views (T023) depend on all table migrations existing.
- Once Foundational completes, Stories 1 and 2 (both P1) can be built in parallel by
  different developers; Stories 3–6 can start as soon as Foundational is done, though
  Story 5's admin-boundary tests are most meaningful once Stories 1–4 have real data.

---

## Parallel Example: User Story 1

```bash
Task: "Integration test: profile save blocked with <2 emergency contacts in tests/integration/student-profile.test.ts"
Task: "E2E test: create student, add severe allergy, confirm banner renders in tests/e2e/student-profile.spec.ts"
Task: "Create Student/EmergencyContact/MedicalAlert TS types in src/types/student.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (student profiles + alerts)
4. Complete Phase 4: User Story 2 (visit logging, alerts-first)
5. **STOP and VALIDATE**: Run quickstart.md scenarios 1–2 independently
6. Deploy/demo — this is a usable clinic-visit safety tool even before medications, communications, or reporting exist

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Stories 1 + 2 (P1) → Deploy/Demo (MVP)
3. Stories 3 + 4 (P2) → Deploy/Demo
4. Stories 5 + 6 (P3) → Deploy/Demo
5. Polish → Final release

## Notes

- [P] tasks touch different files with no dependency on incomplete tasks.
- Commit after each task or logical group.
- Every task that touches a clinical table must keep contracts/rls-policies.md in sync —
  if a task requires a policy this contract doesn't list, update the contract first.
