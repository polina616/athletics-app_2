-- ============================================================
-- ATHLETICS MEET APP — Supabase schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`)
--
-- If you already ran an OLDER version of this file (without athletes /
-- age_groups / event_eligibility / status / bib / event_params columns),
-- run the migration block at the bottom instead of the CREATE TABLE
-- statements.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- MEETS ----------
create table if not exists public.meets (
  id                 uuid primary key default uuid_generate_v4(),
  owner_id           uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  date               date,
  place              text,
  age_groups         text[] not null default '{}',
  event_eligibility  jsonb not null default '[]',
  -- параметры дисциплин с произвольной дистанцией (лыжи/эстафета):
  -- { "ski": { "distanceMeters": 1000 }, "relay": { "distanceMeters": 400, "legs": 4 } }
  event_params       jsonb not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- TEAMS ----------
-- Districts / clubs, scoped to one meet.
create table if not exists public.teams (
  id          uuid primary key default uuid_generate_v4(),
  meet_id     uuid not null references public.meets(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false
);

-- ---------- ATHLETES ----------
-- Saved once, then reused across every discipline they compete in —
-- no need to retype the name/team/age group for every result. bib
-- (стартовый номер) вводится судьёй вручную и уникален для спортсмена.
create table if not exists public.athletes (
  id          uuid primary key,
  meet_id     uuid not null references public.meets(id) on delete cascade,
  team_id     uuid not null references public.teams(id) on delete cascade,
  full_name   text not null,
  bib         text,
  age_group   text not null,
  gender      text not null,               -- 'м' | 'ж'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false
);

-- ---------- ENTRIES ----------
-- One row per individual result. id is generated CLIENT-SIDE (uuid v4) so
-- an entry created offline keeps a stable identity and can be safely
-- upserted once the device reconnects.
create table if not exists public.entries (
  id              uuid primary key,
  meet_id         uuid not null references public.meets(id) on delete cascade,
  team_id         uuid not null references public.teams(id) on delete cascade,
  athlete_id      uuid not null references public.athletes(id) on delete cascade,
  event_key       text not null,               -- '100m' | 'ljRun' | 'ski' | 'relay' | 'pullups' | ...
  age_group       text not null,
  gender          text not null,               -- 'м' | 'ж'
  athlete_name    text not null,               -- cached at entry time — works fully offline
  bib             text,                        -- cached at entry time from athletes.bib
  status          text,                        -- null | 'DNS' | 'DNF' | 'DQ' | 'NM'
  result_raw      text not null default '',    -- what the judge typed, e.g. "13.63" or "2:35.80"
  result_seconds  numeric,                     -- normalized seconds (track) or meters/reps (field/strength)
  manual_points   integer,                     -- official points if known (overrides the estimate)
  auto_points     integer,                     -- last computed estimate, cached for fast reads/sorting
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted         boolean not null default false
);

create index if not exists teams_meet_idx on public.teams(meet_id);
create index if not exists athletes_meet_idx on public.athletes(meet_id);
create index if not exists entries_meet_idx on public.entries(meet_id);
create index if not exists entries_event_idx on public.entries(meet_id, event_key, age_group, gender);

-- Keep updated_at fresh on every UPDATE — the sync engine relies on this
-- column to decide which copy (local vs. remote) is newer.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_meets_updated on public.meets;
create trigger trg_meets_updated before update on public.meets
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_teams_updated on public.teams;
create trigger trg_teams_updated before update on public.teams
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_athletes_updated on public.athletes;
create trigger trg_athletes_updated before update on public.athletes
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_entries_updated on public.entries;
create trigger trg_entries_updated before update on public.entries
  for each row execute function public.touch_updated_at();

-- ============================================================
-- MIGRATION — run this instead if you already created an older version
-- of meets/teams/entries (without athletes / age_groups / event_eligibility
-- / bib / event_params)
-- ============================================================
-- alter table public.meets add column if not exists age_groups text[] not null default '{}';
-- alter table public.meets add column if not exists event_eligibility jsonb not null default '[]';
-- alter table public.meets add column if not exists event_params jsonb not null default '{}';
--
-- create table if not exists public.athletes (
--   id          uuid primary key,
--   meet_id     uuid not null references public.meets(id) on delete cascade,
--   team_id     uuid not null references public.teams(id) on delete cascade,
--   full_name   text not null,
--   bib         text,
--   age_group   text not null,
--   gender      text not null,
--   created_at  timestamptz not null default now(),
--   updated_at  timestamptz not null default now(),
--   deleted     boolean not null default false
-- );
-- -- если таблица athletes уже существовала раньше без bib:
-- alter table public.athletes add column if not exists bib text;
--
-- alter table public.entries add column if not exists athlete_id uuid references public.athletes(id) on delete cascade;
-- alter table public.entries add column if not exists status text;
-- alter table public.entries add column if not exists bib text;
-- alter table public.entries alter column result_raw set default '';
-- create index if not exists athletes_meet_idx on public.athletes(meet_id);
-- drop trigger if exists trg_athletes_updated on public.athletes;
-- create trigger trg_athletes_updated before update on public.athletes
--   for each row execute function public.touch_updated_at();