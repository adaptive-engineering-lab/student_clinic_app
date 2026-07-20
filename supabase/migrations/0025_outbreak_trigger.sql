-- Outbreak/trend detection (FR-021/FR-022, research.md §7). Runs on every visit save
-- so the rule can't be bypassed by any particular client — including an offline write
-- that syncs later with no client open to run a check itself.
create or replace function public.evaluate_outbreak_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold integer;
  v_window_hours integer;
  v_window_start timestamptz;
  v_distinct_count integer;
  v_alert_id uuid;
  v_service_key text;
  v_base_url text;
begin
  select threshold, window_hours into v_threshold, v_window_hours
  from public.outbreak_alert_config
  limit 1;

  v_window_start := NEW.visited_at - make_interval(hours => v_window_hours);

  select count(distinct student_id) into v_distinct_count
  from public.visits
  where chief_complaint = NEW.chief_complaint
    and visited_at >= v_window_start
    and visited_at <= NEW.visited_at;

  if v_distinct_count >= v_threshold then
    -- Don't re-alert on every subsequent matching visit once an unresolved alert
    -- already covers this complaint within the current window.
    if not exists (
      select 1 from public.outbreak_alerts
      where complaint_type = NEW.chief_complaint
        and resolved = false
        and created_at >= v_window_start
    ) then
      insert into public.outbreak_alerts
        (complaint_type, visit_count, window_start, window_end, threshold_used, window_hours)
      values
        (NEW.chief_complaint, v_distinct_count, v_window_start, NEW.visited_at, v_threshold, v_window_hours)
      returning id into v_alert_id;

      -- Best-effort async notification via pg_net — must never block or fail the
      -- triggering visit insert. Reads from Vault rather than hardcoding a secret in
      -- this migration (which is committed to git); populate the 'service_role_key'
      -- and 'edge_functions_base_url' secrets separately per environment (seed.sql
      -- does this for local dev only).
      begin
        select decrypted_secret into v_service_key
        from vault.decrypted_secrets where name = 'service_role_key';
        select decrypted_secret into v_base_url
        from vault.decrypted_secrets where name = 'edge_functions_base_url';

        if v_service_key is not null and v_base_url is not null then
          perform net.http_post(
            url := v_base_url || '/outbreak-alert-notify',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || v_service_key
            ),
            body := jsonb_build_object(
              'complaint_type', NEW.chief_complaint,
              'visit_count', v_distinct_count,
              'window_start', v_window_start,
              'window_end', NEW.visited_at
            )
          );
        end if;
      exception when others then
        raise warning 'outbreak-alert-notify call failed: %', sqlerrm;
      end;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger visits_outbreak_check
after insert on public.visits
for each row execute function public.evaluate_outbreak_alert();
