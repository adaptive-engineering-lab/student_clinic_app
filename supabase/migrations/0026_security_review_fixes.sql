-- T090 security review: reconciles deployed grants/policies with
-- contracts/rls-policies.md, which is the access contract every migration touching
-- these tables must satisfy exactly.

-- emergency_contacts: contract lists SELECT, INSERT, UPDATE only for nurse/super_admin
-- (no DELETE) — 0015_rls_policies.sql granted DELETE and used a single "for all"
-- policy, which made deletion actually reachable. Unlike visits/medications/
-- medical_alerts, this table has no audit trigger (0017_audit_triggers.sql), so a
-- delete here would leave no audit trail at all. There's also no UI feature that
-- deletes a contact. Revoke it and split the policy into exactly the three
-- contracted commands.
revoke delete on public.emergency_contacts from authenticated;
drop policy emergency_contacts_rw on public.emergency_contacts;

create policy emergency_contacts_select on public.emergency_contacts
  for select
  using (app_role() in ('nurse', 'super_admin'));

create policy emergency_contacts_insert on public.emergency_contacts
  for insert
  with check (app_role() in ('nurse', 'super_admin'));

create policy emergency_contacts_update on public.emergency_contacts
  for update
  using (app_role() in ('nurse', 'super_admin'))
  with check (app_role() in ('nurse', 'super_admin'));

-- outbreak_alert_config: contract lists admin as "none" — 0015_rls_policies.sql's
-- select policy included 'admin', letting the admin role read the alert
-- threshold/window configuration directly, which it has no documented need for.
drop policy outbreak_alert_config_select on public.outbreak_alert_config;

create policy outbreak_alert_config_select on public.outbreak_alert_config
  for select
  using (app_role() in ('nurse', 'super_admin'));
