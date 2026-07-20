-- Nurse-facing visit-frequency report (FR-017). visits has no direct SELECT grant
-- (read-audited, 0018), and the report needs student grade/homeroom/name joined in,
-- so this is a dedicated SECURITY DEFINER RPC rather than reusing list_visits().
create or replace function public.report_visit_frequency(
  p_date_from date default null,
  p_date_to date default null,
  p_grade text default null,
  p_homeroom text default null,
  p_chief_complaint text default null,
  p_disposition text default null
)
returns table (
  visit_id uuid,
  student_id uuid,
  student_name text,
  grade text,
  homeroom text,
  visited_at timestamptz,
  chief_complaint text,
  disposition text
)
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
    select
      v.id as visit_id,
      v.student_id,
      (s.first_name || ' ' || s.last_name) as student_name,
      s.grade,
      s.homeroom,
      v.visited_at,
      v.chief_complaint,
      v.disposition
    from public.visits v
    join public.students s on s.id = v.student_id
    where (p_date_from is null or v.visited_at::date >= p_date_from)
      and (p_date_to is null or v.visited_at::date <= p_date_to)
      and (p_grade is null or s.grade = p_grade)
      and (p_homeroom is null or s.homeroom = p_homeroom)
      and (p_chief_complaint is null or v.chief_complaint = p_chief_complaint)
      and (p_disposition is null or v.disposition = p_disposition)
  ),
  logged as (
    insert into public.audit_log (table_name, row_id, action, actor_id)
    select 'visits', rows.visit_id, 'read', auth.uid() from rows
    returning 1
  )
  select * from rows order by visited_at desc;
end;
$$;

grant execute on function public.report_visit_frequency(date, date, text, text, text, text) to authenticated;
