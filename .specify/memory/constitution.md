<!--
Sync Impact Report
- Version change: none (template) → 1.0.0
- Modified principles: N/A (initial ratification)
- Added sections: I. FERPA-First Privacy (NON-NEGOTIABLE); II. Data Integrity & Audit
  Trail; III. Offline-First Reliability; IV. Solo-Maintainable Simplicity; V. Security
  & Compliance by Default; Technology & Compliance Constraints; Development Workflow &
  Quality Gates; Governance
- Removed sections: none
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (generic Constitution Check gate, no changes needed)
  - ✅ .specify/templates/spec-template.md (generic, no changes needed)
  - ✅ .specify/templates/tasks-template.md (generic, no changes needed)
  - ✅ CLAUDE.md (references current plan generically, no changes needed)
- Follow-up TODOs: none — data residency and retention period are intentionally left
  as open items in "Technology & Compliance Constraints" pending district decisions,
  not placeholders left over from the template.
-->

# School Nurse Management System Constitution

## Core Principles

### I. FERPA-First Privacy (NON-NEGOTIABLE)

Individual student health records are education records protected under FERPA. The
`admin` role MUST NEVER receive or be able to query individual student health data —
only aggregated, de-identified data. This boundary MUST be enforced at the database
layer via Supabase Row Level Security (RLS) policies, not solely in application code,
so that a bug in the UI or API layer cannot leak protected data. Any new report, export,
or email deliverable aimed at `admin` or `super_admin` audiences MUST be reviewed for
re-identification risk (e.g., small-N suppression) before it ships.

### II. Data Integrity & Audit Trail

Clinical and medication records are legal/medical documentation, not ordinary app data.
Append-only tables (`medication_administrations`, `audit_log`) MUST NOT support update
or delete operations at the database level (enforce via RLS/permissions, not just
convention). All reads and writes to `visits`, `medications`, and `medical_alerts` MUST
be captured in `audit_log` via Postgres triggers. Edits to same-day visit records are
permitted only per F-3.1; edits after the calendar day boundary are prohibited.

### III. Offline-First Reliability

The nurse's office may have intermittent or no wifi; the app MUST remain usable during
outages. Visit saves, medication administrations, and parent contact logs MUST queue
locally (Dexie/IndexedDB) when Supabase is unreachable and flush in chronological order
on reconnect. Every feature that writes clinical data MUST define its offline queuing
and conflict-resolution behavior before it is considered done — silent data loss on
sync failure is not acceptable; the nurse MUST be notified of sync errors.

### IV. Solo-Maintainable Simplicity

This system is built and maintained by a small team/solo developer. Prefer the managed
platform primitives already chosen (Supabase Postgres/Auth/Storage/Edge Functions,
Vercel, Resend) over introducing new infrastructure, services, or frameworks. Do not
add abstractions, config layers, or generalized frameworks for hypothetical future
needs — solve the current module's requirements directly. Complexity beyond the chosen
stack requires explicit justification (see Complexity Tracking in plan.md).

### V. Security & Compliance by Default

All data is encrypted at rest (Supabase default) and in transit (TLS enforced). Sessions
MUST auto-expire after 30 minutes of inactivity. Access to student health data requires
authentication with a `nurse` or `super_admin` role; role checks MUST be enforced via
RLS policies, never solely via client-side route guards. New features that touch
`students`, `medical_alerts`, `visits`, `medications`, or `immunizations` MUST have RLS
policies defined and tested before merge.

## Technology & Compliance Constraints

- **Stack**: React + Vite (frontend), `vite-plugin-pwa` (offline/installable), Tailwind
  CSS (styling), Supabase (Postgres + Auth + Storage + Edge Functions), Dexie.js
  (offline queue), Resend (transactional email), `@react-pdf/renderer` (PDF generation
  in Edge Functions), Vercel (deployment), GitHub Actions (CI/CD). Introducing a
  replacement or additional service in any of these categories requires updating this
  constitution.
- **Data residency**: Supabase region must be confirmed against district requirements
  before launch (default `us-east-1`); do not assume this is settled — treat as an open
  item until explicitly resolved.
- **Retention**: Visit and health records retention policy is not yet finalized (FERPA
  allows destruction after eligibility ends — typically age 21 or 3 years
  post-graduation). Do not implement automated purge/deletion jobs until a retention
  period is explicitly confirmed.
- **Roles**: Exactly three roles exist — `nurse`, `admin`, `super_admin`. Do not add
  additional roles or permission tiers without updating this constitution and the RLS
  policy set.

## Development Workflow & Quality Gates

- Any feature touching a table listed in Principle V MUST ship with its RLS policies
  and at least one automated test proving `admin` cannot read individual student rows.
- Any feature writing clinical data MUST document its offline-queue and sync-conflict
  behavior (per Principle III) in the feature's plan before implementation begins.
- PDF/CSV/email report generation code MUST be reviewed to confirm the `admin`-facing
  variant contains no student names, IDs, or free-text notes — only aggregates.
- Schema changes to any table in `## 5. Data models` of the product spec require a
  migration file; no ad hoc manual schema edits against the Supabase project.

## Governance

This constitution supersedes ad hoc technical or scope decisions for this project. Any
amendment (adding/removing a principle, changing the stack, changing role model) MUST
update this file, bump the version per semantic versioning below, and record the change
in a Sync Impact Report at the top of this file. `/speckit-plan` MUST run a Constitution
Check gate against the principles above before Phase 0 research and again after Phase 1
design; unresolved violations MUST be justified in the plan's Complexity Tracking table
or the plan MUST be revised.

**Versioning policy**: MAJOR = incompatible principle removal/redefinition, MINOR = new
principle or materially expanded guidance, PATCH = clarification/wording only.

**Version**: 1.0.0 | **Ratified**: 2026-07-11 | **Last Amended**: 2026-07-11
