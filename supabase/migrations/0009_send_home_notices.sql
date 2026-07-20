create table public.send_home_notices (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id),
  pdf_url text,
  generated_at timestamptz not null default now(),
  emailed_to text
);

create index send_home_notices_visit_id_idx on public.send_home_notices (visit_id);
