-- Role assignment: exactly three roles exist (nurse, admin, super_admin), per the
-- project constitution. Provisioned by a super_admin/IT staff, not self-service.
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('nurse', 'admin', 'super_admin')),
  school_id uuid references public.schools(id),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- Users may read their own role assignment (needed by the client to decide what UI to show).
create policy user_roles_select_own on public.user_roles
  for select
  using (user_id = auth.uid());

grant select on public.user_roles to authenticated;

-- SECURITY DEFINER so RLS policies on other tables can call this without granting
-- direct table access to every role; stable so the planner can cache it per statement.
-- Named app_role(), not current_role(), because CURRENT_ROLE is a reserved
-- PostgreSQL keyword/pseudo-function and cannot be reused as a callable identifier.
create or replace function public.app_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

grant execute on function public.app_role() to authenticated;
