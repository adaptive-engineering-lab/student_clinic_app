-- Student photo storage (F-1.2). Bucket is private; access is gated by the same
-- nurse/super_admin RLS pattern as the rest of student data.
insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', false)
on conflict (id) do nothing;

create policy student_photos_rw on storage.objects
  for all
  using (bucket_id = 'student-photos' and public.app_role() in ('nurse', 'super_admin'))
  with check (bucket_id = 'student-photos' and public.app_role() in ('nurse', 'super_admin'));
