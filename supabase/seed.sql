-- Local/test-only seed data. Never run against a production project.
-- Creates one nurse test account used by Playwright e2e specs (tests/e2e/*.spec.ts).
-- GoTrue scans confirmation_token/recovery_token/email_change_token_* as non-null
-- strings; leaving them NULL (the column default) causes a 500 "Database error
-- querying schema" on login, so they're set to '' explicitly here.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'nurse@test.local',
  crypt('test-password-123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '', '', '', '', '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"nurse@test.local"}',
  'email',
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do nothing;

insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000001', 'nurse')
on conflict (user_id) do nothing;

-- Admin test account (US5's FERPA boundary tests/e2e specs need a real admin login,
-- not just a role row, to prove the boundary holds through an actual client session).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'admin@test.local',
  crypt('test-password-123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '', '', '', '', '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '{"sub":"00000000-0000-0000-0000-000000000002","email":"admin@test.local"}',
  'email',
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do nothing;

insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-000000000002', 'admin')
on conflict (user_id) do nothing;

-- Vault secrets the outbreak-alert trigger (0025_outbreak_trigger.sql) needs to call
-- outbreak-alert-notify via pg_net. Local dev only — the "service role key" here is
-- the fixed demo JWT the Supabase CLI prints for every local project (signed with the
-- well-known default JWT_SECRET), not a real secret. A real deployment sets these two
-- Vault secrets separately, out of band, with the actual project's values.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'service_role_key') then
    perform vault.create_secret(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
      'service_role_key',
      'Local dev only — used by the outbreak-alert trigger to call outbreak-alert-notify.'
    );
  end if;
  if not exists (select 1 from vault.secrets where name = 'edge_functions_base_url') then
    perform vault.create_secret(
      'http://kong:8000/functions/v1',
      'edge_functions_base_url',
      'Local dev only — internal Docker-network URL for calling Edge Functions from Postgres.'
    );
  end if;
end $$;
