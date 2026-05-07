-- ============================================
-- 002_policies.sql
-- RLS ve yetki kuralları
-- ============================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where id = auth.uid()
      and is_approved = true
  );
$$;

alter table profiles enable row level security;
alter table league_settings enable row level security;
alter table matches enable row level security;
alter table disputes enable row level security;
alter table dispute_evidence enable row level security;
alter table cup enable row level security;
alter table cup_matches enable row level security;
alter table notifications enable row level security;

-- Eski policy varsa temizle
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Approved users can view profiles" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Admins can delete profiles" on profiles;

drop policy if exists "Approved users can read league settings" on league_settings;
drop policy if exists "Admins can manage league settings" on league_settings;

drop policy if exists "Approved users can read matches" on matches;
drop policy if exists "Players can update own matches" on matches;
drop policy if exists "Admins can manage matches" on matches;

drop policy if exists "Approved users can create disputes" on disputes;
drop policy if exists "Users can view related disputes" on disputes;
drop policy if exists "Admins can manage disputes" on disputes;

drop policy if exists "Approved users can upload evidence" on dispute_evidence;
drop policy if exists "Approved users can view evidence" on dispute_evidence;
drop policy if exists "Admins can manage evidence" on dispute_evidence;

drop policy if exists "Approved users can read cup" on cup;
drop policy if exists "Admins can manage cup" on cup;

drop policy if exists "Approved users can read cup matches" on cup_matches;
drop policy if exists "Players can update own cup matches" on cup_matches;
drop policy if exists "Admins can manage cup matches" on cup_matches;

drop policy if exists "Users can view own notifications" on notifications;
drop policy if exists "Users can update own notifications" on notifications;
drop policy if exists "Admins can create notifications" on notifications;
drop policy if exists "Admins can manage notifications" on notifications;

-- Profiles
create policy "Users can insert own profile"
on profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can view own profile"
on profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Approved users can view profiles"
on profiles
for select
to authenticated
using (public.is_approved() or public.is_admin());

create policy "Users can update own profile"
on profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy "Admins can delete profiles"
on profiles
for delete
to authenticated
using (public.is_admin());

-- League settings
create policy "Approved users can read league settings"
on league_settings
for select
to authenticated
using (public.is_approved() or public.is_admin());

create policy "Admins can manage league settings"
on league_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Matches
create policy "Approved users can read matches"
on matches
for select
to authenticated
using (public.is_approved() or public.is_admin());

create policy "Players can update own matches"
on matches
for update
to authenticated
using (
  public.is_approved()
  and auth.uid() in (home_id, away_id)
)
with check (
  public.is_approved()
  and auth.uid() in (home_id, away_id)
);

create policy "Admins can manage matches"
on matches
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Disputes
create policy "Approved users can create disputes"
on disputes
for insert
to authenticated
with check (
  public.is_approved()
  and auth.uid() = complainant_id
);

create policy "Users can view related disputes"
on disputes
for select
to authenticated
using (
  public.is_admin()
  or auth.uid() in (complainant_id, defendant_id)
);

create policy "Admins can manage disputes"
on disputes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Evidence
create policy "Approved users can upload evidence"
on dispute_evidence
for insert
to authenticated
with check (
  public.is_approved()
  and auth.uid() = uploaded_by
);

create policy "Approved users can view evidence"
on dispute_evidence
for select
to authenticated
using (public.is_approved() or public.is_admin());

create policy "Admins can manage evidence"
on dispute_evidence
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Cup
create policy "Approved users can read cup"
on cup
for select
to authenticated
using (public.is_approved() or public.is_admin());

create policy "Admins can manage cup"
on cup
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Cup matches
create policy "Approved users can read cup matches"
on cup_matches
for select
to authenticated
using (public.is_approved() or public.is_admin());

create policy "Players can update own cup matches"
on cup_matches
for update
to authenticated
using (
  public.is_approved()
  and auth.uid() in (home_id, away_id)
)
with check (
  public.is_approved()
  and auth.uid() in (home_id, away_id)
);

create policy "Admins can manage cup matches"
on cup_matches
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Notifications
create policy "Users can view own notifications"
on notifications
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update own notifications"
on notifications
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Admins can create notifications"
on notifications
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can manage notifications"
on notifications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
