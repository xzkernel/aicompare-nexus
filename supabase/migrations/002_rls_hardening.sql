-- ModelWise cloud sync — RLS hardening (run after 001_cloud_sync.sql)
-- Ensures UPDATE policies cannot reassign rows to another user.

-- profiles: add WITH CHECK on update
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- comparison_sessions
drop policy if exists "comparison_sessions_update_own" on public.comparison_sessions;
create policy "comparison_sessions_update_own" on public.comparison_sessions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- saved_prompts
drop policy if exists "saved_prompts_update_own" on public.saved_prompts;
create policy "saved_prompts_update_own" on public.saved_prompts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- preferences
drop policy if exists "preferences_update_own" on public.preferences;
create policy "preferences_update_own" on public.preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Force RLS even for table owners (Supabase service role bypasses RLS by design)
alter table public.profiles force row level security;
alter table public.comparison_sessions force row level security;
alter table public.saved_prompts force row level security;
alter table public.preferences force row level security;
