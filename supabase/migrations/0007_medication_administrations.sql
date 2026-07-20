-- Append-only: no UPDATE/DELETE grants are given to any role (see 0015_rls_policies.sql).
-- Corrections are handled by inserting a new compensating record, never by mutating history.
create table public.medication_administrations (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id),
  visit_id uuid not null references public.visits(id),
  administered_at timestamptz not null default now(),
  administered_by uuid not null references auth.users(id),
  dose_given text,
  notes text
);

create index medication_administrations_medication_id_idx on public.medication_administrations (medication_id);
create index medication_administrations_visit_id_idx on public.medication_administrations (visit_id);
