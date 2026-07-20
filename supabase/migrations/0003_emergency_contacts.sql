create table public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  name text not null,
  relationship text not null,
  phone_primary text not null,
  phone_secondary text,
  email text,
  authorised_to_pickup boolean not null default false,
  created_at timestamptz not null default now()
);

create index emergency_contacts_student_id_idx on public.emergency_contacts (student_id);
