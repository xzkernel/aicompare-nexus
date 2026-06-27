-- ModelWise optional cloud sync schema
-- Run in Supabase SQL editor or via supabase db push

-- profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id);

-- comparison_sessions
create table if not exists public.comparison_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt text not null,
  left_model text not null,
  right_model text not null,
  left_response text,
  right_response text,
  left_time_ms integer,
  right_time_ms integer,
  left_tokens integer,
  right_tokens integer,
  pinned boolean not null default false,
  device_id text not null default 'unknown',
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists comparison_sessions_user_updated_idx
  on public.comparison_sessions (user_id, updated_at desc);

alter table public.comparison_sessions enable row level security;

create policy "comparison_sessions_select_own" on public.comparison_sessions
  for select using (auth.uid() = user_id);

create policy "comparison_sessions_insert_own" on public.comparison_sessions
  for insert with check (auth.uid() = user_id);

create policy "comparison_sessions_update_own" on public.comparison_sessions
  for update using (auth.uid() = user_id);

create policy "comparison_sessions_delete_own" on public.comparison_sessions
  for delete using (auth.uid() = user_id);

-- saved_prompts
create table if not exists public.saved_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text not null,
  device_id text not null default 'unknown',
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists saved_prompts_user_updated_idx
  on public.saved_prompts (user_id, updated_at desc);

alter table public.saved_prompts enable row level security;

create policy "saved_prompts_select_own" on public.saved_prompts
  for select using (auth.uid() = user_id);

create policy "saved_prompts_insert_own" on public.saved_prompts
  for insert with check (auth.uid() = user_id);

create policy "saved_prompts_update_own" on public.saved_prompts
  for update using (auth.uid() = user_id);

create policy "saved_prompts_delete_own" on public.saved_prompts
  for delete using (auth.uid() = user_id);

-- preferences
create table if not exists public.preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  theme text not null default 'dark',
  sync_enabled boolean not null default true,
  device_id text not null default 'unknown',
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.preferences enable row level security;

create policy "preferences_select_own" on public.preferences
  for select using (auth.uid() = user_id);

create policy "preferences_insert_own" on public.preferences
  for insert with check (auth.uid() = user_id);

create policy "preferences_update_own" on public.preferences
  for update using (auth.uid() = user_id);

create policy "preferences_delete_own" on public.preferences
  for delete using (auth.uid() = user_id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
