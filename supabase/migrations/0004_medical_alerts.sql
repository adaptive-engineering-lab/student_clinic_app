create table public.medical_alerts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  type text not null check (type in ('allergy', 'condition')),
  subtype text,
  name text not null,
  severity text not null check (severity in ('mild', 'moderate', 'severe', 'life-threatening')),
  requires_immediate_action boolean not null default false,
  epipen_on_file boolean not null default false,
  inhaler_on_file boolean not null default false,
  storage_location text,
  notes text,
  created_at timestamptz not null default now()
);

create index medical_alerts_student_id_idx on public.medical_alerts (student_id);
