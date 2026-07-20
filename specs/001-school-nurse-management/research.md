# Phase 0 Research: School Nurse Management System

All items in Technical Context were already resolved from the product spec and
constitution (no `NEEDS CLARIFICATION` markers remained). This document instead resolves
the non-trivial design decisions the plan depends on, and flags one real technical risk
discovered during research.

## 1. Enforcing the FERPA nurse/admin boundary at the database layer

**Decision**: Base clinical tables (`students`, `medical_alerts`, `visits`, `medications`,
`medication_administrations`, `immunizations`) have RLS policies that grant `SELECT` only
to `nurse` and `super_admin`. The `admin` role has **no policy granting row access** on
these tables at all (default-deny). Admin-facing reporting reads exclusively from
dedicated Postgres views/functions (e.g., `admin_visit_summary`, `admin_immunization_gaps`)
that pre-aggregate data server-side and are the only objects `admin` has `SELECT` on.

**Rationale**: This makes it structurally impossible for an application bug (a forgotten
filter, a debug query, a new endpoint) to leak individual student rows to `admin` — the
database itself has nothing to leak, per Constitution Principle I.

**Alternatives considered**: Application-layer filtering only (rejected — a single missed
check anywhere in the client or an Edge Function would leak PII, which is exactly what
the constitution prohibits); row-level column masking on the base tables (rejected —
more complex than dedicated aggregate views, and harder to reason about for small-N
suppression).

## 2. Small-N suppression for admin aggregate views

**Decision**: Every admin-facing aggregate view groups by the requested dimensions
(complaint type, grade, date bucket, etc.) and suppresses (nulls out or merges into an
"other" bucket) any group with fewer than 5 underlying students.

**Rationale**: A breakdown that isolates a group of 1-2 students is effectively
individual-level data even without a name attached (e.g., "1 student in 3rd grade with
a peanut allergy"). Five is a common minimum-cell-size convention for de-identified
public health reporting and satisfies Constitution Principle I's re-identification
review requirement.

**Alternatives considered**: No suppression (rejected — fails the constitution's
re-identification review); differential privacy noise injection (rejected — disproportionate
complexity for Principle IV's solo-maintainable-simplicity constraint at this scale).

## 3. Append-only enforcement for `medication_administrations` and `audit_log`

**Decision**: No role — including `nurse` and `super_admin` — is granted `UPDATE` or
`DELETE` on these two tables at the Postgres grant level (not just via RLS policy, since
table owners bypass RLS). Corrections to a mistaken administration entry are handled by
inserting a new compensating record that references the original, never by mutating history.

**Rationale**: Matches Constitution Principle II literally ("MUST NOT support update or
delete operations at the database level") and F-4.3's "append-only — no edits or deletes
after save."

## 4. Read-audit logging (`audit_log` covering reads, not just writes)

**Risk identified**: Postgres triggers fire on DML (`INSERT`/`UPDATE`/`DELETE`), not on
`SELECT` — there is no native trigger for reads. A literal reading of "all reads ... are
logged to `audit_log` via Postgres triggers" (constitution Principle II) is not achievable
with triggers alone.

**Decision**: Writes to `visits`, `medications`, `medical_alerts` are captured by
`AFTER INSERT/UPDATE` triggers as originally specified. Reads are captured at the
application boundary instead: all client reads of these tables go through Postgres
`SECURITY DEFINER` RPC functions (not raw `select()` calls against the table), and each
RPC call inserts one `audit_log` row before returning data. This is enforced by *only*
granting `SELECT` on the base tables to the RPC functions' owning role, not to
`nurse`/`super_admin` directly — client code is structurally forced through the logged path.

**Alternatives considered**: Rely on Supabase's platform request logs (rejected — those
are infrastructure logs outside the application's control and not queryable as
first-class audit data); accept write-only auditing (rejected — contradicts the explicit
constitution requirement; flagged here rather than silently dropped).

## 5. Offline conflict resolution

**Decision**: Last-write-wins at the row level, keyed on `updated_at`, matching the
product spec's stated policy. The Dexie queue stores each pending write with a client
timestamp; on flush, writes are sent in chronological (client-timestamp) order. If a
sync request fails (e.g., the row was deleted or the schema rejects it), the nurse is
shown a persistent in-app notification with the failed item, rather than failing silently.

**Rationale**: Matches existing product decision (section 6 of the product spec) and
Constitution Principle III's "no silent data loss" requirement. Given the realistic
concurrency pattern (one nurse's office, rarely two devices editing the same visit),
last-write-wins is proportionate; a full CRDT/OT approach would violate Principle IV.

**Alternatives considered**: Server-side merge/3-way diff (rejected — disproportionate
complexity for a single-nurse-per-school access pattern).

## 6. PDF generation inside Supabase Edge Functions

**Risk identified**: `@react-pdf/renderer` (named in the constitution's approved stack)
is a Node.js library; Supabase Edge Functions run on the Deno runtime. Deno supports
importing many npm packages via `npm:` specifiers, but `@react-pdf/renderer` depends on
Node-specific internals (e.g., `fontkit`, native buffer/font-loading behavior) that are
not guaranteed to work under Deno's Node-compat layer.

**Decision**: Attempt the `npm:@react-pdf/renderer` import in the Edge Function first,
since Supabase's Node-compat layer covers a growing set of npm packages. If it fails to
render correctly in the Edge runtime (to be validated in the first implementation spike
for the `generate-report-pdf` function), fall back to generating the PDF with a
Deno-native/lighter-weight library (`pdf-lib` or `@sirherobrine23`-style pure-JS PDF
generators) using the same layout content, without introducing a non-Supabase compute
service. This stays within the constitution's approved stack (still an Edge Function; no
new infrastructure) even if the specific PDF library must change.

**Rationale**: Surfacing this now avoids discovering a runtime incompatibility mid-implementation;
the fallback keeps Principle IV intact (no new service introduced).

## 7. Outbreak-alert evaluation trigger

**Decision**: An `AFTER INSERT` trigger on `visits` calls a Postgres function that counts
matching-complaint visits from distinct students in the trailing 72-hour (or configured)
window. If the configured threshold is met, it inserts an `outbreak_alerts` row and
invokes the `send-report-email` Edge Function (via Supabase's `pg_net`/webhook pattern or
a `pg_cron`-polled queue table) to email the aggregate summary to admins.

**Rationale**: Matches "runs on every new visit save" (F-6.5) exactly and keeps the rule
server-side so it can't be bypassed by any particular client.

**Alternatives considered**: Client-triggered check after every visit save (rejected —
would miss alerts if triggered from an offline-queued write that syncs later without the
client being open; a DB trigger fires regardless of which client wrote the row).

## 8. Session inactivity timeout

**Decision**: Supabase Auth issues short-lived JWTs with refresh tokens; a 30-minute
inactivity timeout is implemented client-side (an idle timer that resets on user
interaction and calls `supabase.auth.signOut()` on expiry), since JWT expiry alone
governs token lifetime, not idle time.

**Rationale**: Matches Constitution Principle V and F-session requirement using the
existing Supabase Auth primitive rather than introducing a session-management service.
