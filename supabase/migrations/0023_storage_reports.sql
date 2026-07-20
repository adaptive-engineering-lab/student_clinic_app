-- Report PDF storage (FR-019/FR-020). Unlike send-home-notices (nurse-only clinical
-- content), report PDFs are safe for all three roles to retrieve their own generated
-- reports from — admin's variant is pre-aggregated by construction (generate-report-pdf
-- enforces this server-side), so there's no FERPA concern in granting admin this bucket.
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;

create policy reports_storage_rw on storage.objects
  for all
  using (bucket_id = 'reports' and public.app_role() in ('nurse', 'admin', 'super_admin'))
  with check (bucket_id = 'reports' and public.app_role() in ('nurse', 'admin', 'super_admin'));
