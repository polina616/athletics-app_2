-- ============================================================
-- ROW LEVEL SECURITY
-- Every judge only ever sees/edits their OWN meets. Run after schema.sql.
-- ============================================================

alter table public.meets    enable row level security;
alter table public.teams    enable row level security;
alter table public.athletes enable row level security;
alter table public.entries  enable row level security;

-- MEETS: owner has full access
drop policy if exists "meets_owner_all" on public.meets;
create policy "meets_owner_all"
  on public.meets for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- TEAMS: full access if you own the parent meet
drop policy if exists "teams_owner_all" on public.teams;
create policy "teams_owner_all"
  on public.teams for all
  using (exists (select 1 from public.meets m where m.id = teams.meet_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.meets m where m.id = teams.meet_id and m.owner_id = auth.uid()));

-- ATHLETES: full access if you own the parent meet
drop policy if exists "athletes_owner_all" on public.athletes;
create policy "athletes_owner_all"
  on public.athletes for all
  using (exists (select 1 from public.meets m where m.id = athletes.meet_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.meets m where m.id = athletes.meet_id and m.owner_id = auth.uid()));

-- ENTRIES: full access if you own the parent meet
drop policy if exists "entries_owner_all" on public.entries;
create policy "entries_owner_all"
  on public.entries for all
  using (exists (select 1 from public.meets m where m.id = entries.meet_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.meets m where m.id = entries.meet_id and m.owner_id = auth.uid()));

-- ------------------------------------------------------------
-- OPTIONAL: public read-only access for a results board.
-- Uncomment if you want an unauthenticated "public leaderboard" page
-- that anyone with the link can view (but not edit).
-- ------------------------------------------------------------
-- alter table public.meets add column if not exists public_share boolean not null default false;
--
-- drop policy if exists "meets_public_read" on public.meets;
-- create policy "meets_public_read" on public.meets for select
--   using (public_share = true);
--
-- drop policy if exists "teams_public_read" on public.teams;
-- create policy "teams_public_read" on public.teams for select
--   using (exists (select 1 from public.meets m where m.id = teams.meet_id and m.public_share = true));
--
-- drop policy if exists "athletes_public_read" on public.athletes;
-- create policy "athletes_public_read" on public.athletes for select
--   using (exists (select 1 from public.meets m where m.id = athletes.meet_id and m.public_share = true));
--
-- drop policy if exists "entries_public_read" on public.entries;
-- create policy "entries_public_read" on public.entries for select
--   using (exists (select 1 from public.meets m where m.id = entries.meet_id and m.public_share = true));