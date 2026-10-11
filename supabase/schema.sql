-- Protopia database schema. Applied to Supabase project dhkwefjuximycghhoapk as migration `protopia_schema`.
create extension if not exists postgis with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 3 and 120),
  vision_prompt text not null,
  context text,
  category text not null default 'Other',
  place_name text,
  location extensions.geography(Point, 4326) not null,
  before_path text not null,
  after_path text not null,
  budget_eur numeric(12,2),
  vote_count integer not null default 0,
  status text not null default 'proposed' check (status in ('proposed','planning','funded','building','done','archived')),
  created_at timestamptz not null default now()
);
create index projects_location_idx on public.projects using gist (location);
create index projects_votes_idx on public.projects (vote_count desc);
create index projects_creator_idx on public.projects (creator_id);

create table public.visualizations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id),
  project_id uuid references public.projects(id) on delete set null,
  photo_path text not null,
  output_path text,
  prompt text not null,
  model text not null,
  cost_usd numeric(8,4),
  created_at timestamptz not null default now()
);
create index visualizations_creator_idx on public.visualizations (creator_id, created_at desc);
create index visualizations_project_idx on public.visualizations (project_id);

create table public.project_specs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  label text not null,
  value text not null,
  sort integer not null default 0
);
create index project_specs_project_idx on public.project_specs (project_id);

create table public.project_resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  item text not null,
  quantity numeric(12,2) not null,
  unit text not null default 'pcs'
);
create index project_resources_project_idx on public.project_resources (project_id);

create table public.project_labour (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role text not null,
  hours numeric(10,1) not null
);
create index project_labour_project_idx on public.project_labour (project_id);

create table public.votes (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index votes_user_idx on public.votes (user_id);

create table public.pledges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  kind text not null check (kind in ('funds','labour','materials')),
  amount numeric(12,2),
  description text,
  created_at timestamptz not null default now()
);
create index pledges_project_idx on public.pledges (project_id);
create index pledges_user_idx on public.pledges (user_id);

-- Keep projects.vote_count in sync. Security definer so a voter can update the count on someone else's project.
create function public.sync_vote_count() returns trigger
language plpgsql security definer set search_path = '' as $$
declare pid uuid := coalesce(new.project_id, old.project_id);
begin
  update public.projects set vote_count = (select count(*) from public.votes where project_id = pid) where id = pid;
  return null;
end $$;
create trigger votes_sync after insert or delete on public.votes for each row execute function public.sync_vote_count();

-- Projects visible in the current map viewport
create function public.projects_in_bbox(west float, south float, east float, north float, max_rows int default 500)
returns setof public.projects language sql stable set search_path = '' as $$
  select * from public.projects
  where status <> 'archived'
    and location operator(extensions.&&) extensions.st_makeenvelope(west, south, east, north, 4326)::extensions.geography
  order by vote_count desc
  limit max_rows;
$$;

-- Row-level security
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.visualizations enable row level security;
alter table public.project_specs enable row level security;
alter table public.project_resources enable row level security;
alter table public.project_labour enable row level security;
alter table public.votes enable row level security;
alter table public.pledges enable row level security;

create policy "read profiles" on public.profiles for select using (true);
create policy "update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "read projects" on public.projects for select using (true);
create policy "create projects" on public.projects for insert to authenticated with check ((select auth.uid()) = creator_id);
create policy "creator edits project" on public.projects for update to authenticated using ((select auth.uid()) = creator_id) with check ((select auth.uid()) = creator_id);

create policy "own visualizations" on public.visualizations for select to authenticated using ((select auth.uid()) = creator_id);

create policy "read specs" on public.project_specs for select using (true);
create policy "creator writes specs" on public.project_specs for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.creator_id = (select auth.uid())))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.creator_id = (select auth.uid())));
create policy "read resources" on public.project_resources for select using (true);
create policy "creator writes resources" on public.project_resources for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.creator_id = (select auth.uid())))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.creator_id = (select auth.uid())));
create policy "read labour" on public.project_labour for select using (true);
create policy "creator writes labour" on public.project_labour for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.creator_id = (select auth.uid())))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.creator_id = (select auth.uid())));

create policy "read votes" on public.votes for select using (true);
create policy "cast own vote" on public.votes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "remove own vote" on public.votes for delete to authenticated using ((select auth.uid()) = user_id);

create policy "read pledges" on public.pledges for select using (true);
create policy "make own pledge" on public.pledges for insert to authenticated with check ((select auth.uid()) = user_id);
