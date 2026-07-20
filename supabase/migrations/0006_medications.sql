create table public.medications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  medication_name text not null,
  brand_name text,
  form text check (form in ('tablet', 'liquid', 'inhaler', 'injection', 'other')),
  dose_amount numeric,
  dose_unit text check (dose_unit in ('mg', 'ml', 'puff', 'other')),
  frequency text,
  schedule_times time[],
  prescribing_physician text,
  start_date date,
  end_date date,
  active boolean not null default true,
  parent_consent_on_file boolean not null default false,
  consent_date date,
  consent_method text check (consent_method in ('signed form', 'email', 'portal')),
  special_instructions text,
  created_at timestamptz not null default now()
);

create index medications_student_id_idx on public.medications (student_id);
