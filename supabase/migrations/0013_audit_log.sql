-- Append-only: no UPDATE/DELETE grants are given to any role (see 0015_rls_policies.sql).
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id uuid not null,
  action text not null check (action in ('insert', 'update', 'read')),
  actor_id uuid references auth.users(id),
  occurred_at timestamptz not null default now(),
  detail jsonb
);

create index audit_log_table_row_idx on public.audit_log (table_name, row_id);
create index audit_log_actor_idx on public.audit_log (actor_id);
