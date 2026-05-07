# Supabase Database Migrations

Bu klasör eFootball Lig uygulamasının database kurulum dosyalarını içerir.

## Dosyalar

- `001_init.sql`: tabloları oluşturur.
- `002_policies.sql`: RLS/policy kurallarını oluşturur.
- `003_seed_admin_and_players.sql`: admin ve local oyuncu profillerini oluşturur/günceller.
- `reset_season.sql`: fikstür, maç sonuçları ve kupayı temizler; kullanıcıları silmez.

## Kullanım

Supabase > SQL Editor içinde sırayla çalıştır:

1. `001_init.sql`
2. `002_policies.sql`
3. `003_seed_admin_and_players.sql`

Not: `003_seed_admin_and_players.sql` çalışmadan önce kullanıcılar Supabase Dashboard > Authentication > Users üzerinden oluşturulmuş olmalı.
