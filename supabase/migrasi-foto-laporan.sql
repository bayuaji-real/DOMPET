-- Foto lampiran laporan bug (Pusat Bantuan)
alter table public.help_reports add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('help-attachments', 'help-attachments', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "help_attach_insert_own" on storage.objects;
create policy "help_attach_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'help-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "help_attach_select_own" on storage.objects;
create policy "help_attach_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'help-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
