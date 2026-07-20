-- Discovered while implementing generate-report-pdf: `service_role` bypasses RLS
-- (its BYPASSRLS attribute) but is NOT exempt from ordinary GRANT/REVOKE checks —
-- it still needs an explicit table grant like any other role. The `reports` table's
-- admin RLS policy (0015) is SELECT-only (admin has no direct INSERT grant, per
-- contracts/rls-policies.md), so the report-generating Edge Functions insert on the
-- caller's behalf using the service-role client — which requires this grant to work
-- for either role, not just admin.
grant select, insert on public.reports to service_role;
