-- These views are the ONLY objects the admin role reads for visit/immunization data.
-- They run with the view owner's privileges (Postgres views default to
-- security_invoker = false), so granting `authenticated` SELECT on the view does not
-- require granting SELECT on the underlying clinical tables — admin still has no
-- direct-table access per 0015_rls_policies.sql. Groups smaller than 5 distinct
-- students are omitted entirely (small-N suppression, research.md §2) to avoid
-- re-identifying an individual student through a narrow breakdown.

create view public.admin_visit_summary as
select
  date_trunc('day', v.visited_at) as visit_date,
  v.chief_complaint,
  s.grade,
  count(*) as visit_count,
  count(distinct v.student_id) as distinct_student_count
from public.visits v
join public.students s on s.id = v.student_id
group by 1, 2, 3
having count(distinct v.student_id) >= 5;

grant select on public.admin_visit_summary to authenticated;

-- Simplification: "overdue or missing" here means a student has no immunization
-- record with a future next_due_date. This does not yet account for a
-- vaccine-specific required schedule (out of scope for this migration) — refine
-- once the district's required-immunization list is modeled.
create view public.admin_immunization_gaps as
select
  s.grade,
  count(*) filter (
    where i.next_due_date is null or i.next_due_date < current_date
  ) as overdue_or_missing_count,
  count(*) as total_students
from public.students s
left join public.immunizations i on i.student_id = s.id
group by s.grade
having count(*) filter (
  where i.next_due_date is null or i.next_due_date < current_date
) >= 5;

grant select on public.admin_immunization_gaps to authenticated;

-- outbreak_alerts already contains no student identifiers by construction; this view
-- exists so admin never needs a direct grant on the base table.
create view public.admin_outbreak_alert_feed as
select id, complaint_type, visit_count, window_start, window_end, resolved, created_at
from public.outbreak_alerts;

grant select on public.admin_outbreak_alert_feed to authenticated;

-- Supabase's ALTER DEFAULT PRIVILEGES bootstrap grants ALL privileges to
-- anon/authenticated on every new relation (including views) at creation time —
-- the 0015 blanket revoke ran before these views existed, so it didn't cover them.
-- These views aren't updatable (grouped aggregates over joins) so INSERT/UPDATE/
-- DELETE would already fail, but lock the grants down to SELECT-only for hygiene.
revoke all on public.admin_visit_summary, public.admin_immunization_gaps, public.admin_outbreak_alert_feed
  from anon, authenticated;
grant select on public.admin_visit_summary, public.admin_immunization_gaps, public.admin_outbreak_alert_feed
  to authenticated;
