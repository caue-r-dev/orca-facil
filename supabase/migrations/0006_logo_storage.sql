-- Public storage bucket for empresa logos, used by the public
-- orçamento page (/o/[id]) and PDF. Files are public-read (the
-- point is to display them on a document anyone with the link can
-- open); writes are restricted to authenticated prestadores.

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos_public_read" on storage.objects
  for select using (bucket_id = 'logos');

create policy "logos_authenticated_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'logos');

create policy "logos_authenticated_update" on storage.objects
  for update to authenticated using (bucket_id = 'logos');

create policy "logos_authenticated_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'logos');
