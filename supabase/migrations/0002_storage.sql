-- Storage buckets for CMS-uploaded media.
--
-- Split out of 0001 deliberately. `storage.objects` is owned by
-- `supabase_storage_admin`, and depending on project age and CLI version a
-- `create policy` on it can fail with `42501: must be owner of table objects`
-- when applied through `supabase db push`. Isolating it means that failure
-- leaves the content schema in 0001 fully applied — rerun this one file in the
-- dashboard SQL editor (which runs as a role that can), and nothing else needs
-- to be touched.
--
-- Everything here is idempotent, so re-running it is always safe.

-- Fleet photos land in `fleet` / `fleet-logo`; `gallery` backs the Galeri
-- section. Buckets are public-read so next/image can fetch the objects without
-- a signed URL — these are marketing photos, and the alternative would make
-- every card a dynamic request.
insert into storage.buckets (id, name, public)
values ('fleet', 'fleet', true), ('fleet-logo', 'fleet-logo', true), ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists "media public read" on storage.objects;
create policy "media public read"
  on storage.objects for select
  using (bucket_id in ('fleet', 'fleet-logo', 'gallery'));

-- Writes are admin-only. `is_admin()` is security definer, so it resolves the
-- allowlist even though the caller has no rights on `admins` itself.
drop policy if exists "media admin write" on storage.objects;
create policy "media admin write"
  on storage.objects for all
  using (bucket_id in ('fleet', 'fleet-logo', 'gallery') and is_admin())
  with check (bucket_id in ('fleet', 'fleet-logo', 'gallery') and is_admin());
