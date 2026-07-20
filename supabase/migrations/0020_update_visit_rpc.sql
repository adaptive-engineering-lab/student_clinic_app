-- Direct `UPDATE ... WHERE id = ...` via PostgREST requires SELECT privilege on the
-- filtered/returned columns even with Prefer: return=minimal (Postgres needs SELECT
-- to evaluate the WHERE clause), which `visits` deliberately doesn't grant (read-audit,
-- 0015_rls_policies.sql). So same-day visit edits (FR-007) go through this RPC
-- instead, exactly like the read path in 0018_read_audit_rpcs.sql.
--
-- SECURITY DEFINER means this runs as the function owner, which bypasses RLS
-- entirely — so the nurse/same-day/ownership check below is enforced explicitly in
-- the function body, not delegated to the (now unreachable via PostgREST, but still
-- present as defense-in-depth) visits_update_same_day_own RLS policy.
create or replace function public.update_visit(
  p_visit_id uuid,
  p_chief_complaint text default null,
  p_chief_complaint_notes text default null,
  p_temperature_celsius numeric default null,
  p_bp_systolic integer default null,
  p_bp_diastolic integer default null,
  p_pulse_bpm integer default null,
  p_oxygen_saturation integer default null,
  p_assessment text default null,
  p_actions_taken text[] default null,
  p_disposition text default null,
  p_parent_contacted boolean default null,
  p_parent_contact_log jsonb default null
)
returns setof public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nurse_id uuid;
  v_visited_at timestamptz;
begin
  if public.app_role() not in ('nurse', 'super_admin') then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select nurse_id, visited_at into v_nurse_id, v_visited_at
  from public.visits where id = p_visit_id;

  if v_nurse_id is null then
    raise exception 'visit not found' using errcode = 'P0002';
  end if;

  if v_nurse_id != auth.uid() or v_visited_at::date != (now() at time zone 'utc')::date then
    raise exception 'edits are only permitted by the recording nurse on the same calendar day'
      using errcode = '42501';
  end if;

  return query
  update public.visits set
    chief_complaint = coalesce(p_chief_complaint, chief_complaint),
    chief_complaint_notes = coalesce(p_chief_complaint_notes, chief_complaint_notes),
    temperature_celsius = coalesce(p_temperature_celsius, temperature_celsius),
    bp_systolic = coalesce(p_bp_systolic, bp_systolic),
    bp_diastolic = coalesce(p_bp_diastolic, bp_diastolic),
    pulse_bpm = coalesce(p_pulse_bpm, pulse_bpm),
    oxygen_saturation = coalesce(p_oxygen_saturation, oxygen_saturation),
    assessment = coalesce(p_assessment, assessment),
    actions_taken = coalesce(p_actions_taken, actions_taken),
    disposition = coalesce(p_disposition, disposition),
    parent_contacted = coalesce(p_parent_contacted, parent_contacted),
    parent_contact_log = coalesce(p_parent_contact_log, parent_contact_log),
    updated_at = now()
  where id = p_visit_id
  returning *;
end;
$$;

grant execute on function public.update_visit(
  uuid, text, text, numeric, integer, integer, integer, integer, text, text[], text, boolean, jsonb
) to authenticated;
