-- ============================================
-- 001_init.sql
-- eFootball Lig Veritabanı - Temel tablolar
-- ============================================

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  is_admin boolean default false,
  is_approved boolean default false,
  created_at timestamptz default now()
);

create table if not exists league_settings (
  id int primary key default 1,
  name text not null default 'Dostlar Ligi',
  format text default 'double',
  season int default 1,
  match_deadline_days int default 14,
  created_at timestamptz default now(),
  constraint single_row check (id = 1)
);

insert into league_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  round int not null,
  home_id uuid references profiles(id) on delete cascade,
  away_id uuid references profiles(id) on delete cascade,
  home_score int,
  away_score int,
  status text default 'open' check (status in ('open','pending','played','disputed')),
  proposed_by uuid references profiles(id),
  proposed_home int,
  proposed_away int,
  proposed_home_scorers jsonb default '[]',
  proposed_away_scorers jsonb default '[]',
  home_scorers jsonb default '[]',
  away_scorers jsonb default '[]',
  deadline timestamptz,
  played_at timestamptz,
  season int default 1,
  created_at timestamptz default now()
);

create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  complainant_id uuid references profiles(id),
  defendant_id uuid references profiles(id),
  reason text,
  description text,
  status text default 'open' check (status in ('open','responded','resolved')),
  resolution text,
  winner_id uuid references profiles(id),
  resolved_by uuid references profiles(id),
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table if not exists dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid references disputes(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  photo_url text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists cup (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size int not null,
  season int default 1,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists cup_matches (
  id uuid primary key default gen_random_uuid(),
  cup_id uuid references cup(id) on delete cascade,
  round_index int not null,
  pair_index int not null,
  home_id uuid references profiles(id),
  away_id uuid references profiles(id),
  home_score int,
  away_score int,
  is_done boolean default false
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);
