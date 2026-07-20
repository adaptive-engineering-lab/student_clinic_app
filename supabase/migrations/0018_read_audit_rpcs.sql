-- Read-side of the audit trail (Constitution Principle II / research.md §4). Postgres
-- triggers can't fire on SELECT, so these SECURITY DEFINER RPCs are the only way the
-- client reads visits/medications/medical_alerts — direct table SELECT is revoked for
-- authenticated in 0015_rls_policies.sql, forcing every read through here, where each
-- returned row is logged to audit_log before being returned.

-- visits
create or replace function public.list_visits(p_student_id uuid default null)
returns setof public.visits
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() not in ('nurse', 'super_admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
  with rows as (
    select * from public.visits
    where p_student_id is null or student_id = p_student_id
    order by visited_at desc
  ),
  logged as (
    insert into public.audit_log (table_name, row_id, action, actor_id)
    select 'visits', id, 'read', auth.uid() from rows
    returning 1
  )
  select * from rows;
end;
$$;

grant execute on function public.list_visits(uuid) to authenticated;

create or replace function public.get_visit(p_visit_id uuid)
returns setof public.visits
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() not in ('nurse', 'super_admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
  with rows as (
    select * from public.visits where id = p_visit_id
  ),
  logged as (
    insert into public.audit_log (table_name, row_id, action, actor_id)
    select 'visits', id, 'read', auth.uid() from rows
    returning 1
  )
  select * from rows;
end;
$$;

grant execute on function public.get_visit(uuid) to authenticated;

-- medications
create or replace function public.list_medications(p_student_id uuid default null)
returns setof public.medications
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() not in ('nurse', 'super_admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
  with rows as (
    select * from public.medications
    where p_student_id is null or student_id = p_student_id
  ),
  logged as (
    insert into public.audit_log (table_name, row_id, action, actor_id)
    select 'medications', id, 'read', auth.uid() from rows
    returning 1
  )
  select * from rows;
end;
$$;

grant execute on function public.list_medications(uuid) to authenticated;

-- medical_alerts
create or replace function public.list_medical_alerts(p_student_id uuid default null)
returns setof public.medical_alerts
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() not in ('nurse', 'super_admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
  with rows as (
    select * from public.medical_alerts
    where p_student_id is null or student_id = p_student_id
  ),
  logged as (
    insert into public.audit_log (table_name, row_id, action, actor_id)
    select 'medical_alerts', id, 'read', auth.uid() from rows
    returning 1
  )
  select * from rows;
end;
$$;

grant execute on function public.list_medical_alerts(uuid) to authenticated;
