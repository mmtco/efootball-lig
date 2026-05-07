-- ============================================
-- reset_season.sql
-- Sadece fikstür, skor ve kupayı siler.
-- Kullanıcıları silmez.
-- ============================================

delete from cup_matches;
delete from cup;
delete from matches;
