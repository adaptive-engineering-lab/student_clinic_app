# Contract: Row Level Security Policies

This is the access contract every migration touching these tables must satisfy. Tests in
`tests/integration` MUST assert each "admin: none" row is actually enforced (Constitution
Development Workflow gate).

| Table | nurse | admin | super_admin |
|---|---|---|---|
| students | SELECT, INSERT, UPDATE | none | SELECT, INSERT, UPDATE |
| emergency_contacts | SELECT, INSERT, UPDATE | none | SELECT, INSERT, UPDATE |
| medical_alerts | INSERT, UPDATE, DELETE via table grant; SELECT only via `list_medical_alerts()`/`get_medical_alert()` RPC (read-audited, Constitution Principle II) | none | same as nurse |
| visits | INSERT via table grant; SELECT only via `list_visits()`/`get_visit()` RPC (read-audited); UPDATE only via `update_visit()` RPC (own, same-day only — see note below) | none | same as nurse |
| medications | INSERT, UPDATE via table grant; SELECT only via `list_medications()` RPC (read-audited) | none | same as nurse |
| medication_administrations | SELECT, INSERT (no UPDATE/DELETE for anyone) | none | SELECT, INSERT (no UPDATE/DELETE for anyone) |
| communication_log | SELECT, INSERT, UPDATE | none | SELECT, INSERT, UPDATE |
| send_home_notices | SELECT, INSERT | none | SELECT, INSERT |
| immunizations | SELECT, INSERT, UPDATE | none | SELECT, INSERT, UPDATE |
| reports | SELECT, INSERT (own) | SELECT (own, admin-audience rows only) | SELECT, INSERT (own) |
| outbreak_alerts | SELECT | SELECT (via `admin_outbreak_alert_feed` only) | SELECT, UPDATE (resolve) |
| outbreak_alert_config | SELECT | none | SELECT, UPDATE |
| audit_log | none (write-only via trigger/RPC, no direct client SELECT) | none | SELECT (read-only, no UPDATE/DELETE for anyone) |
| admin_visit_summary (view) | SELECT | SELECT | SELECT |
| admin_immunization_gaps (view) | SELECT | SELECT | SELECT |

**Rules that apply across all rows above**:

- "none" means no RLS policy grants that role any row — default-deny, not
  policy-based filtering to zero rows client-side.
- Any new table holding individual student health data MUST be added to this table
  before merge, per the constitution's Development Workflow gate.

**Why `visits`/`medications`/`medical_alerts` route through RPCs instead of direct
grants**: PostgreSQL requires `SELECT` privilege on any column referenced in an
`UPDATE ... WHERE` clause — and PostgREST always compiles `.update().eq(...)` to that
shape — even when the client requests `Prefer: return=minimal`. Since these three
tables intentionally have no `SELECT` grant (to force all reads through the
audit-logging RPCs in 0018_read_audit_rpcs.sql), a direct `UPDATE` against them fails
with `permission denied` even for a legitimate same-day edit by the owning nurse. This
was caught by the integration test in tests/integration/visit-edit-window.test.ts,
which is why `update_visit()` (0020_update_visit_rpc.sql) exists: a `SECURITY DEFINER`
function that enforces `nurse_id = auth.uid() AND visited_at::date = today` explicitly
in its body (SECURITY DEFINER bypasses RLS entirely, so this check cannot be delegated
to a table policy) and performs the update internally, still firing the existing
`AFTER UPDATE` audit trigger. `INSERT` doesn't have this problem — there's no `WHERE`
clause to evaluate — so inserts still go through direct table grants.
