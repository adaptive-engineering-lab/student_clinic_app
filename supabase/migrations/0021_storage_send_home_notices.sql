-- Send-home notice PDF storage (FR-016). Bucket is private; access gated by the same
-- nurse/super_admin RLS pattern as student-photos (0019).
insert into storage.buckets (id, name, public)
values ('send-home-notices', 'send-home-notices', false)
on conflict (id) do nothing;

create policy send_home_notices_storage_rw on storage.objects
  for all
  using (bucket_id = 'send-home-notices' and public.app_role() in ('nurse', 'super_admin'))
  with check (bucket_id = 'send-home-notices' and public.app_role() in ('nurse', 'super_admin'));
