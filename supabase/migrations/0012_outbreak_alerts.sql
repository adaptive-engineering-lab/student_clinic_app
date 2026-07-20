create table public.outbreak_alerts (
  id uuid primary key default gen_random_uuid(),
  complaint_type text not null,
  visit_count integer not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  resolved boolean not null default false,
  threshold_used integer not null,
  window_hours integer not null,
  created_at timestamptz not null default now()
);

create table public.outbreak_alert_config (
  id uuid primary key default gen_random_uuid(),
  threshold integer not null default 5,
  window_hours integer not null default 72,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

-- Singleton row: exactly one config row drives all outbreak-alert evaluations.
insert into public.outbreak_alert_config (threshold, window_hours) values (5, 72);
