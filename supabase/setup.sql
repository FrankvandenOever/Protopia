-- Protopia: run this AFTER schema.sql in the Supabase SQL Editor.
-- Creates image storage buckets and auto-creates a profile row for every new user.

-- 1. Storage buckets (public read so map pins and project pages can show images)
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true), ('visions', 'visions', true)
on conflict (id) do nothing;

-- Anyone can view project images
create policy "public read project images" on storage.objects
  for select using (bucket_id in ('photos', 'visions'));

-- Signed-in users upload photos only into their own folder: photos/<user id>/<file>
create policy "users upload own photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 'visions' is written only by the server (/api/visualize) with the service role key,
-- so it has no insert policy for users.

-- 2. Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
