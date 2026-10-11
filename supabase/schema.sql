-- Protopia database schema (Supabase / Postgres + PostGIS)
create extension if not exists postgis;

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id),
  title text not null check (char_length(title) between 3 and 120),
  vision_prompt text not null,
  context text,
  category text not null default 'Other',
  place_name text,
  location geography(Point, 4326) not null,
  before_path text not null,          -- storage: photos/<uuid>.jpg
  after_path text not null,           -- storage: visions/<uuid>.jpg
  budget_eur numeric(12,2),
  vote_count integer not null default 0,
  status text not null default 'proposed' check (status in ('proposed','planning','funded','building','done','archived')),
  created_at timestamptz not null default now()
);
create index projects_location_idx on projects using gist (location);
create index projects_votes_idx on projects (vote_count desc);

-- Every AI generation, including ones that were not approved
create table visualizations (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references profiles(id),
  project_id uuid references projects(id) on delete set null,
  photo_path text not null,
  output_path text,
  prompt text not null,
  model text not null,
  cost_usd numeric(8,4),
  created_at timestamptz not null default now()
);

create table project_specs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  label text not null,
  value text not null,
  sort integer not null default 0
);

create table project_resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  item text not null,
  quantity numeric(12,2) not null,
  unit text not null default 'pcs'
);

create table project_labour (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  role text not null,
  hours numeric(10,1) not null
);

create table votes (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table pledges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id),
  kind text not null check (kind in ('funds','labour','materials')),
  amount numeric(12,2),               -- euros for funds, hours for labour
  description text,                   -- materials, or a note
  created_at timestamptz not null default now()
);

-- Keep projects.vote_count in sync
create function sync_vote_count() returns trigger language plpgsql as $$
begin
  update projects set vote_count = (select count(*) from votes where project_id = coalesce(new.project_id, old.project_id))
  where id = coalesce(new.project_id, old.project_id);
  return null;
end $$;
create trigger votes_sync after insert or delete on votes for each row execute function sync_vote_count();

-- Projects visible in the current map viewport
create function projects_in_bbox(west float, south float, east float, north float, max_rows int default 500)
returns setof projects language sql stable as $$
  select * from projects
  where status <> 'archived'
    and location && st_makeenvelope(west, south, east, north, 4326)::geography
  order by vote_count desc
  limit max_rows;
$$;

-- Row-level security: everyone reads, signed-in users write their own rows
alter table profiles enable row level security;
alter table projects enable row level security;
alter table visualizations enable row level security;
alter table project_specs enable row level security;
alter table project_resources enable row level security;
alter table project_labour enable row level security;
alter table votes enable row level security;
alter table pledges enable row level security;

create policy "read profiles" on profiles for select using (true);
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "read projects" on projects for select using (true);
create policy "create projects" on projects for insert with check (auth.uid() = creator_id);
create policy "creator edits project" on projects for update using (auth.uid() = creator_id);

create policy "own visualizations" on visualizations for all using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

create policy "read specs" on project_specs for select using (true);
create policy "creator edits specs" on project_specs for all
  using (exists (select 1 from projects p where p.id = project_id and p.creator_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.creator_id = auth.uid()));
create policy "read resources" on project_resources for select using (true);
create policy "creator edits resources" on project_resources for all
  using (exists (select 1 from projects p where p.id = project_id and p.creator_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.creator_id = auth.uid()));
create policy "read labour" on project_labour for select using (true);
create policy "creator edits labour" on project_labour for all
  using (exists (select 1 from projects p where p.id = project_id and p.creator_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.creator_id = auth.uid()));

create policy "read votes" on votes for select using (true);
create policy "own votes" on votes for insert with check (auth.uid() = user_id);
create policy "remove own votes" on votes for delete using (auth.uid() = user_id);

create policy "read pledges" on pledges for select using (true);
create policy "own pledges" on pledges for insert with check (auth.uid() = user_id);
