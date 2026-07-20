create table public.reports (
  id uuid primary key default gen_random_uuid(),
  generated_by uuid not null references auth.users(id),
  report_type text not null,
  audience text not null check (audience in ('nurse', 'admin')),
  filters jsonb,
  pdf_url text,
  csv_url text,
  generated_at timestamptz not null default now()
);

create index reports_generated_by_idx on public.reports (generated_by);
