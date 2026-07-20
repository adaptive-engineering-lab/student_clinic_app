create table public.immunizations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  vaccine_name text not null,
  date_administered date,
  administered_by text,
  lot_number text,
  next_due_date date,
  created_at timestamptz not null default now()
);

create index immunizations_student_id_idx on public.immunizations (student_id);
create index immunizations_next_due_date_idx on public.immunizations (next_due_date);
