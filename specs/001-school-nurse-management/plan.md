# Implementation Plan: School Nurse Management System

**Branch**: `001-school-nurse-management` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-school-nurse-management/spec.md`

## Summary

A progressive web app that lets school nurses manage student health profiles, log clinic
visits with alerts-first safety, administer medications under consent controls, maintain
a parent/guardian communication trail, and generate nurse (full-detail) vs. admin
(aggregate-only) reports — with full offline queuing for intermittent school wifi.
Technical approach: a single Vite/React PWA talking directly to Supabase (Postgres, Auth,
Storage, Edge Functions), with Dexie/IndexedDB as an offline write queue and read cache,
Resend for email delivery, and `@react-pdf/renderer` for PDF generation inside Edge
Functions. The FERPA nurse/admin boundary and the append-only medication/audit trail are
enforced at the Postgres RLS/grant layer, not just in the client.

## Technical Context

**Language/Version**: TypeScript 5.x on Node 20 (build tooling); React 18 (frontend); Postgres 15 (Supabase-managed)

**Primary Dependencies**: React + Vite, `vite-plugin-pwa`, Tailwind CSS, `@supabase/supabase-js`, Dexie.js, `@react-pdf/renderer`, Resend SDK, Supabase Edge Functions (Deno runtime)

**Storage**: Supabase Postgres (system of record); Supabase Storage (student photos, generated PDFs); IndexedDB via Dexie (offline write queue + read cache)

**Testing**: Vitest + React Testing Library (unit/component), Playwright (end-to-end critical flows: visit save, offline queue/sync, admin vs. nurse report), SQL-level RLS policy tests run against a local Supabase instance (pgTAP or scripted assertions)

**Target Platform**: Modern evergreen browsers on desktop/tablet/mobile, installable as a PWA; deployed to Vercel

**Project Type**: Web application — single-page frontend + Supabase backend-as-a-service (no separate custom API server)

**Performance Goals**: Alert banner and roster search results render in <3s (SC-001, SC-008); routine visit save round-trip <2 min end-to-end user flow (SC-005); offline-queued writes sync within 60s of reconnect (SC-006); outbreak alert raised within one visit-save (SC-007)

**Constraints**: Must remain fully usable for visit/medication/parent-contact logging with zero connectivity (Principle III); admin role must be structurally incapable of reading individual student records (Principle I); medication administration records and audit log are append-only at the DB layer (Principle II); 30-minute inactivity session timeout (Principle V); no new infrastructure beyond the constitution's approved stack (Principle IV)

**Scale/Scope**: Single school district, one or more schools; hundreds to low thousands of students per school; a handful of nurses and admins per school — not a high-concurrency system

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
| --- | --- | --- |
| I. FERPA-First Privacy | Admin-facing reports/alerts served from dedicated aggregate queries/views with RLS restricting admin to zero rows on `students`, `visits`, `medications`, `medical_alerts`, `immunizations`; small-N suppression applied in aggregate views | PASS (design detailed in Phase 1 data-model/contracts) |
| II. Data Integrity & Audit Trail | `medication_administrations` and `audit_log` have no `UPDATE`/`DELETE` grants for any role; audit trigger on `visits`/`medications`/`medical_alerts` writes; read-audit handled via logged RPC access path (see research.md) | PASS |
| III. Offline-First Reliability | Dexie queue for visit/medication/contact writes; service worker triggers chronological flush on reconnect; sync-failure surfaces a nurse-visible notification | PASS |
| IV. Solo-Maintainable Simplicity | No services introduced beyond the constitution's approved stack; PDF/email/offline all use chosen platform primitives | PASS |
| V. Security & Compliance by Default | Supabase Auth session + client-side inactivity timer enforce 30-minute timeout; RLS policies gate all clinical tables by role; TLS/encryption-at-rest are Supabase defaults | PASS |

No violations — Complexity Tracking table is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-school-nurse-management/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── components/          # Shared/presentational UI (alert banner, tables, forms)
├── features/
│   ├── students/        # Student profiles, emergency contacts, roster search
│   ├── alerts/          # Medical alerts, severity logic, banner rendering
│   ├── visits/          # Visit log create/edit, disposition workflow
│   ├── medications/     # Medications on file + administration workflow
│   ├── communications/  # Parent contact log, send-home notice
│   └── reports/         # Nurse/admin report generation, exports, outbreak alerts
├── lib/
│   ├── supabase.ts      # Supabase client
│   ├── offline/         # Dexie schema, write queue, sync flush logic
│   └── pdf/             # Shared PDF layout helpers (consumed by edge functions)
├── hooks/
├── routes/
└── types/

supabase/
├── migrations/           # One file per schema change (students, medical_alerts, visits,
│                         # medications, medication_administrations, communications,
│                         # immunizations, reports, outbreak_alerts, audit_log)
├── functions/
│   ├── generate-report-pdf/
│   └── send-report-email/
└── policies/             # RLS policy SQL, organized per table

tests/
├── unit/                 # Vitest component/unit tests
├── integration/           # Vitest + Supabase local instance (RLS, triggers, offline sync)
└── e2e/                   # Playwright critical-flow tests
```

**Structure Decision**: Single deployable web application. There is no separate custom
backend server — Supabase provides Postgres, Auth, Storage, and Edge Functions directly,
so backend logic lives under `supabase/` (migrations, RLS policies, edge functions)
rather than a `backend/src/` tree. `src/` is organized by feature (matching the spec's
user stories) rather than by technical layer, so each user story maps to one `features/`
subdirectory that can be built and tested independently per the constitution's
simplicity principle.

## Complexity Tracking

*No constitution violations — table intentionally empty.*
