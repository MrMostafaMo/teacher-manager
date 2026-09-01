-- DroosManger — Supabase Storage Policies
-- شغّل هذا الملف مرة واحدة في: Supabase Dashboard → SQL Editor → New query → Run
-- يعزل كل معلم بمجلده: {userId}/sync-data.json و {userId}/backups/...

drop policy if exists "own sync read" on storage.objects;
drop policy if exists "own sync write" on storage.objects;
drop policy if exists "own backups read" on storage.objects;
drop policy if exists "own backups write" on storage.objects;

create policy "own sync read"
on storage.objects for select
using (bucket_id='sync' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own sync write"
on storage.objects for all
using (bucket_id='sync' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id='sync' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own backups read"
on storage.objects for select
using (bucket_id='backups' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own backups write"
on storage.objects for all
using (bucket_id='backups' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id='backups' and (storage.foldername(name))[1] = auth.uid()::text);
