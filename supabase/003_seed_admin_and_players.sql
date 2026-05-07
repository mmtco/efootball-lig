-- ============================================
-- 003_seed_admin_and_players.sql
-- Admin ve local kullanıcı profilleri
-- Not: Auth kullanıcılarını önce Supabase Dashboard > Authentication > Users kısmından oluştur.
-- ============================================

-- Admin hesabını admin + approved yap
insert into profiles (id, username, display_name, is_admin, is_approved)
select
  id,
  split_part(email, '@', 1),
  split_part(email, '@', 1),
  true,
  true
from auth.users
where email = 'efootballorganization@gmail.com'
on conflict (id) do update
set is_admin = true,
    is_approved = true;

-- Local oyuncu profillerini approved yap
insert into profiles (id, username, display_name, is_admin, is_approved)
select
  id,
  split_part(email, '@', 1),
  initcap(split_part(email, '@', 1)),
  false,
  true
from auth.users
where email in (
  'ali@local.test',
  'onur@local.test',
  'tayfun@local.test',
  'kadir@local.test',
  'mehmetcan@local.test',
  'berk@local.test'
)
on conflict (id) do update
set is_admin = false,
    is_approved = true;
