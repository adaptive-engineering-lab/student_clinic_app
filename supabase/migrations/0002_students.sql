create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id),
  student_id_ext text unique,
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  gender text,
  grade text,
  homeroom text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index students_school_id_idx on public.students (school_id);
create index students_last_name_idx on public.students (last_name, first_name);
