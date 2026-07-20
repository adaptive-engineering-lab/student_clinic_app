-- Write-side of the audit trail (Constitution Principle II). Runs as the function
-- owner (SECURITY DEFINER), so it can insert into audit_log even though authenticated
-- has no direct INSERT grant on it (0015_rls_policies.sql).
create or replace function public.audit_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (table_name, row_id, action, actor_id, detail)
  values (tg_table_name, new.id, lower(tg_op), auth.uid(), to_jsonb(new));
  return new;
end;
$$;

create trigger visits_audit
after insert or update on public.visits
for each row execute function public.audit_write();

create trigger medications_audit
after insert or update on public.medications
for each row execute function public.audit_write();

create trigger medical_alerts_audit
after insert or update on public.medical_alerts
for each row execute function public.audit_write();
