create table public.visits (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id),
  nurse_id uuid not null references auth.users(id),
  visited_at timestamptz not null default now(),
  chief_complaint text not null,
  chief_complaint_notes text,
  temperature_celsius numeric(4, 1),
  bp_systolic integer,
  bp_diastolic integer,
  pulse_bpm integer,
  oxygen_saturation integer,
  assessment text check (char_length(assessment) <= 5000),
  actions_taken text[],
  disposition text not null check (
    disposition in ('returned_to_class', 'sent_home', 'emergency_transport', 'still_in_clinic')
  ),
  parent_contacted boolean not null default false,
  parent_contact_log jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index visits_student_id_idx on public.visits (student_id);
create index visits_nurse_id_idx on public.visits (nurse_id);
create index visits_visited_at_idx on public.visits (visited_at);
create index visits_chief_complaint_idx on public.visits (chief_complaint, visited_at);
