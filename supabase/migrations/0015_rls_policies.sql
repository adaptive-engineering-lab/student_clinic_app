-- FERPA boundary (Constitution Principle I): every app user authenticates as the
-- single Postgres/PostgREST "authenticated" role, so the nurse/admin/super_admin
-- distinction is enforced entirely by RLS policy predicates on app_role()
-- (defined in 0014_roles.sql), not by separate Postgres GRANTs. A GRANT here only
-- distinguishes "authenticated app user" from "anon"/"service_role" — the app-role
-- boundary is default-deny: any table with no policy matching an admin's
-- app_role() returns zero rows for admin, per contracts/rls-policies.md.

-- Supabase's bootstrap grants ALL privileges (including DELETE and TRUNCATE) to
-- anon/authenticated on every table by default (via ALTER DEFAULT PRIVILEGES) —
-- TRUNCATE in particular bypasses RLS row policies entirely. Start from a clean
-- slate and re-grant only what each table's contract calls for below.
revoke all on all tables in schema public from anon, authenticated;

-- user_roles: re-grant the SELECT already established in 0014_roles.sql, since the
-- blanket revoke above strips it too.
grant select on public.user_roles to authenticated;

-- schools: read-only reference data for any authenticated clinic staff.
alter table public.schools enable row level security;
grant select on public.schools to authenticated;
create policy schools_select on public.schools
  for select
  using (app_role() in ('nurse', 'admin', 'super_admin'));

-- students
alter table public.students enable row level security;
grant select, insert, update on public.students to authenticated;
create policy students_rw on public.students
  for all
  using (app_role() in ('nurse', 'super_admin'))
  with check (app_role() in ('nurse', 'super_admin'));

-- emergency_contacts
alter table public.emergency_contacts enable row level security;
grant select, insert, update, delete on public.emergency_contacts to authenticated;
create policy emergency_contacts_rw on public.emergency_contacts
  for all
  using (app_role() in ('nurse', 'super_admin'))
  with check (app_role() in ('nurse', 'super_admin'));

-- medical_alerts: read-audited (Constitution Principle II) — no direct SELECT grant.
-- All reads MUST go through public.list_medical_alerts()/get_medical_alert()
-- (0018_read_audit_rpcs.sql), which log to audit_log before returning rows. Writes
-- are still direct (INSERT/UPDATE), captured by the AFTER trigger in 0017.
alter table public.medical_alerts enable row level security;
grant insert, update, delete on public.medical_alerts to authenticated;
revoke select on public.medical_alerts from authenticated, anon;
create policy medical_alerts_write on public.medical_alerts
  for all
  using (app_role() in ('nurse', 'super_admin'))
  with check (app_role() in ('nurse', 'super_admin'));

-- visits: read-audited (Constitution Principle II) — no direct SELECT grant. All
-- reads MUST go through public.list_visits()/get_visit() (0018_read_audit_rpcs.sql).
-- Edits are restricted to the recording nurse, same calendar day only (FR-007).
alter table public.visits enable row level security;
grant insert, update on public.visits to authenticated;
revoke select on public.visits from authenticated, anon;

create policy visits_insert on public.visits
  for insert
  with check (app_role() in ('nurse', 'super_admin'));

create policy visits_update_same_day_own on public.visits
  for update
  using (
    app_role() in ('nurse', 'super_admin')
    and nurse_id = auth.uid()
    and visited_at::date = (now() at time zone 'utc')::date
  )
  with check (
    app_role() in ('nurse', 'super_admin')
    and nurse_id = auth.uid()
    and visited_at::date = (now() at time zone 'utc')::date
  );

-- medications: read-audited (Constitution Principle II) — no direct SELECT grant.
-- All reads MUST go through public.list_medications()/get_medication()
-- (0018_read_audit_rpcs.sql). The administration-eligibility check (FR-013) is
-- re-verified server-side in medication_administrations_insert below regardless of
-- what the client believes it read.
alter table public.medications enable row level security;
grant insert, update on public.medications to authenticated;
revoke select on public.medications from authenticated, anon;
create policy medications_write on public.medications
  for all
  using (app_role() in ('nurse', 'super_admin'))
  with check (app_role() in ('nurse', 'super_admin'));

-- SECURITY DEFINER so the consent check below doesn't require granting `authenticated`
-- direct SELECT on medications (which is read-audited and has no such grant, above).
create or replace function public.medication_is_administrable(p_medication_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.medications m
    where m.id = p_medication_id
      and m.active
      and m.parent_consent_on_file
  );
$$;

grant execute on function public.medication_is_administrable(uuid) to authenticated;

-- medication_administrations: append-only (Constitution Principle II). Only SELECT
-- and INSERT are ever granted — no UPDATE/DELETE grant exists for any role, so even
-- a permissive policy could not allow mutation. INSERT additionally requires the
-- referenced medication to be active with consent on file (FR-013/FR-014).
alter table public.medication_administrations enable row level security;
grant select, insert on public.medication_administrations to authenticated;
revoke update, delete on public.medication_administrations from authenticated, anon;

create policy medication_administrations_select on public.medication_administrations
  for select
  using (app_role() in ('nurse', 'super_admin'));

create policy medication_administrations_insert on public.medication_administrations
  for insert
  with check (
    app_role() in ('nurse', 'super_admin')
    and public.medication_is_administrable(medication_id)
  );

-- communication_log
alter table public.communication_log enable row level security;
grant select, insert, update on public.communication_log to authenticated;
create policy communication_log_rw on public.communication_log
  for all
  using (app_role() in ('nurse', 'super_admin'))
  with check (app_role() in ('nurse', 'super_admin'));

-- send_home_notices
alter table public.send_home_notices enable row level security;
grant select, insert on public.send_home_notices to authenticated;
create policy send_home_notices_rw on public.send_home_notices
  for all
  using (app_role() in ('nurse', 'super_admin'))
  with check (app_role() in ('nurse', 'super_admin'));

-- immunizations
alter table public.immunizations enable row level security;
grant select, insert, update on public.immunizations to authenticated;
create policy immunizations_rw on public.immunizations
  for all
  using (app_role() in ('nurse', 'super_admin'))
  with check (app_role() in ('nurse', 'super_admin'));

-- reports: nurse/super_admin see their own; admin sees only their own admin-audience rows.
alter table public.reports enable row level security;
grant select, insert on public.reports to authenticated;

create policy reports_nurse_own on public.reports
  for all
  using (app_role() in ('nurse', 'super_admin') and generated_by = auth.uid())
  with check (app_role() in ('nurse', 'super_admin') and generated_by = auth.uid());

create policy reports_admin_own on public.reports
  for select
  using (app_role() = 'admin' and generated_by = auth.uid() and audience = 'admin');

-- outbreak_alerts: admin does not get a direct-table policy — admin reads via the
-- admin_outbreak_alert_feed view only (0016_admin_aggregate_views.sql), which
-- contains no student identifiers by construction.
alter table public.outbreak_alerts enable row level security;
grant select, update on public.outbreak_alerts to authenticated;

create policy outbreak_alerts_select on public.outbreak_alerts
  for select
  using (app_role() in ('nurse', 'super_admin'));

create policy outbreak_alerts_resolve on public.outbreak_alerts
  for update
  using (app_role() = 'super_admin')
  with check (app_role() = 'super_admin');

-- outbreak_alert_config
alter table public.outbreak_alert_config enable row level security;
grant select, update on public.outbreak_alert_config to authenticated;

create policy outbreak_alert_config_select on public.outbreak_alert_config
  for select
  using (app_role() in ('nurse', 'admin', 'super_admin'));

create policy outbreak_alert_config_update on public.outbreak_alert_config
  for update
  using (app_role() = 'super_admin')
  with check (app_role() = 'super_admin');

-- audit_log: append-only, no UPDATE/DELETE grant for any role. Writes happen only
-- through SECURITY DEFINER triggers/RPCs (0017, 0018), which run as the function
-- owner and so do not need a direct client-facing INSERT grant. Only super_admin
-- can read it directly.
alter table public.audit_log enable row level security;
grant select on public.audit_log to authenticated;
revoke insert, update, delete on public.audit_log from authenticated, anon;

create policy audit_log_select on public.audit_log
  for select
  using (app_role() = 'super_admin');
