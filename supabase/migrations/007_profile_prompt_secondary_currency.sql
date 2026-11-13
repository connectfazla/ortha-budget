-- 007: display name + photo, "don't ask again" for the notifications prompt, optional second currency display.
-- Already included in supabase/schema.sql for fresh installs.

alter table user_settings
  add column display_name text check (display_name is null or length(btrim(display_name)) between 1 and 60),
  add column avatar_path text check (avatar_path is null or split_part(avatar_path, '/', 1) = user_id),
  add column notify_prompt_never boolean not null default false,
  add column secondary_currency char(3) check (secondary_currency is null or secondary_currency ~ '^[A-Z]{3}$');

-- Private bucket for profile photos: <user id>/avatar-<uuid>.<ext>, served through short-lived signed links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = ((select auth.jwt()) ->> 'sub'));
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = ((select auth.jwt()) ->> 'sub') and not (select public.is_demo_user()));
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = ((select auth.jwt()) ->> 'sub'));
