-- Protopia storage and auth setup. Applied to Supabase as migration `protopia_storage_and_auth`, after schema.sql.

-- Public buckets: files are served by public URL. No select policy, so clients cannot list bucket contents.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic']),
       ('visions', 'visions', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Signed-in users upload photos only into their own folder: photos/<user id>/<file>
create policy "users upload own photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 'visions' is written only by the server (/api/visualize) with the service role key.

-- Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_vote_count() from public, anon, authenticated;
