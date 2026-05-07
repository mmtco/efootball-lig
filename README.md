# 🏆 eFootball Lig

16 oyunculu eFootball/PES arkadaş ligi yönetim uygulaması.

## ⚙️ Kurulum

### 1. Supabase bilgilerini gir

`config.js` dosyasını aç ve şu iki satırı kendi bilgilerinle değiştir:

```javascript
const SUPABASE_URL = 'https://xxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc.....(uzun anon key)';
```

Supabase'de **Project Settings → Data API** sayfasından bunları alabilirsin.

### 2. GitHub'a yükle

1. GitHub'da yeni bir repository oluştur (mesela `efootball-lig`)
2. **Public** olabilir (kod açık olur ama bilgiler config.js'de zaten — anon key public, sorun değil)
3. Bu klasördeki tüm dosyaları sürükle-bırak yükle

### 3. Vercel'e bağla

1. Vercel.com'a git, GitHub hesabınla giriş yap
2. **"Add New..." → Project**
3. GitHub'daki `efootball-lig` reposunu seç → **Import**
4. **Framework Preset:** Other
5. **Build settings:** Hiçbir şey değiştirme, hepsi varsayılan
6. **Deploy** bas

1-2 dakika sonra siten yayında! Adres: `efootball-lig-xxx.vercel.app`

## 🎯 Kullanım

### İlk Yönetici Kurulumu
Supabase'de SQL Editor'de şu kodu çalıştırarak kendini admin yap:

```sql
update profiles set is_admin = true, is_approved = true
where id = (select id from auth.users where email = 'KENDI_EMAILIN');
```

### Üye Akışı
1. Yeni kullanıcı kayıt olur (email + şifre)
2. Email doğrulama maili gelir, doğrular
3. **Admin onayı** bekler
4. Sen admin olarak Yönetim sekmesinden onaylarsın
5. Lige girer, fikstürü görür, maçları oynar

### Maç Akışı
1. Maçlar fikstürde gözükür
2. Birisi skoru girer → "Önerildi" durumuna geçer
3. Karşı taraf **onaylar** (skor doğruysa) veya **karşı öneri verir** (yanlışsa)
4. Skorlar uyuşunca maç tamamlanır
5. Onaylanmazsa **itiraz** edilir → admin (sen) çözer

## 📁 Dosya Yapısı

```
efootball-lig/
├── index.html      # Ana sayfa
├── style.css       # Tasarım
├── config.js       # Supabase bilgileri (BURASI DÜZENLENECEK)
├── db.js           # Veritabanı çağrıları
├── app.js          # Uygulama mantığı
├── README.md       # Bu dosya
└── vercel.json     # Vercel ayarları
```

## 🔒 Güvenlik

- `anon key` public olarak kullanılır, paylaşılması güvenlidir
- `service_role key` ASLA public olmamalı (bu projede kullanılmıyor)
- Tüm veritabanı erişimi Row Level Security (RLS) ile korunuyor
