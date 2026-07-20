create table public.communication_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  visit_id uuid references public.visits(id),
  contact_name text,
  relationship text,
  method text check (method in ('call', 'text', 'email')),
  timestamp timestamptz not null default now(),
  outcome text check (outcome in ('reached', 'no answer', 'left voicemail', 'sent message')),
  notes text,
  created_at timestamptz not null default now()
);

create index communication_log_student_id_idx on public.communication_log (student_id);
create index communication_log_visit_id_idx on public.communication_log (visit_id);
