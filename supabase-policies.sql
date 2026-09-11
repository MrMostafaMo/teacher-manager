-- Teacher Manager — Supabase Storage Policies
-- شغّل هذا الملف مرة واحدة في: Supabase Dashboard → SQL Editor → New query → Run
-- حزمة واحدة فقط باسم `sync`. يعزل كل معلم بمجلده:
--   {userId}/sync-data.json (لقطة المزامنة) و {userId}/backups/... (النسخ السحابية)
-- لا تنشئ حزمة باسم `backups` — النسخ مجلد داخل حزمة `sync` (BACKUPS_FOLDER).

drop policy if exists "own sync read" on storage.objects;
drop policy if exists "own sync write" on storage.objects;
-- Leftover from the two-bucket draft: backups live inside the `sync` bucket.
drop policy if exists "own backups read" on storage.objects;
drop policy if exists "own backups write" on storage.objects;

create policy "own sync read"
on storage.objects for select
using (bucket_id='sync' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own sync write"
on storage.objects for all
using (bucket_id='sync' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id='sync' and (storage.foldername(name))[1] = auth.uid()::text);
