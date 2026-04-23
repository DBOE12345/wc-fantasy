-- Run this entire file in your Supabase SQL editor

-- Profiles (auto-created on signup)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  email text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Public profiles" on profiles for select using (true);
create policy "Own profile update" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Leagues
create table if not exists leagues (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  code text unique not null,
  size int not null default 4,
  creator_id uuid references auth.users,
  draft_pos int default 0,
  bracket_data text,
  created_at timestamptz default now()
);
alter table leagues enable row level security;
create policy "League members can read" on leagues for select using (
  exists (select 1 from league_members where league_id = leagues.id and user_id = auth.uid())
);
create policy "Any auth user can create" on leagues for insert with check (auth.uid() = creator_id);
create policy "Members can update" on leagues for update using (
  exists (select 1 from league_members where league_id = leagues.id and user_id = auth.uid())
);

-- League members
create table if not exists league_members (
  id uuid default gen_random_uuid() primary key,
  league_id uuid references leagues on delete cascade,
  user_id uuid references auth.users on delete cascade,
  draft_slot int not null default 0,
  pts int default 0,
  joined_at timestamptz default now(),
  unique(league_id, user_id),
  unique(league_id, draft_slot)
);
alter table league_members enable row level security;
create policy "Members can read" on league_members for select using (
  exists (select 1 from league_members lm where lm.league_id = league_members.league_id and lm.user_id = auth.uid())
);
create policy "Auth users can join" on league_members for insert with check (auth.uid() = user_id);

-- Picks (draft selections)
create table if not exists picks (
  id uuid default gen_random_uuid() primary key,
  league_id uuid references leagues on delete cascade,
  user_id uuid references auth.users on delete cascade,
  team_name text not null,
  picked_at timestamptz default now(),
  unique(league_id, team_name)
);
alter table picks enable row level security;
create policy "Members can read picks" on picks for select using (
  exists (select 1 from league_members where league_id = picks.league_id and user_id = auth.uid())
);
create policy "Members can insert picks" on picks for insert with check (
  auth.uid() = user_id and
  exists (select 1 from league_members where league_id = picks.league_id and user_id = auth.uid())
);

-- Enable realtime on leagues and picks
alter publication supabase_realtime add table leagues;
alter publication supabase_realtime add table picks;
