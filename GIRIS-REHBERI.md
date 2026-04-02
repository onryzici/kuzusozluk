# kuzu sözlük — giriş rehberi

## projeyi çalıştırma

```bash
cd sozluk
npm run dev
# http://localhost:3000
```

## test hesapları

| kullanıcı | e-posta | şifre | rol |
|-----------|---------|-------|-----|
| ahmet | ahmet@example.com | Sifre123! | yazar |
| elif | elif@example.com | Sifre123! | yazar |
| mehmet | mehmet@example.com | Sifre123! | **admin** |

---

## admin paneli

### giriş
1. `mehmet@example.com` / `Sifre123!` ile giriş yap
2. tarayıcıda `/admin` adresine git
3. veya sağ üstteki kullanıcı menüsünden "ayarlar" → admin paneli linki

### admin dashboard (`/admin`)
- toplam kullanıcı, entry, başlık, rapor sayıları
- bekleyen rapor sayısı

### kullanıcı yönetimi (`/admin/kullanicilar`)
- tüm kullanıcıları listele ve ara
- **ban/unban**: kullanıcıyı engelle veya engeli kaldır
  - banlanan kullanıcılar giriş yapamaz
  - aktif oturumları `/engellendi` sayfasına yönlendirilir
- **rol değiştir**: USER → AUTHOR → MODERATOR → ADMIN
  - USER: sadece okuyabilir
  - AUTHOR: entry yazabilir
  - MODERATOR: başkalarının entrylerini silebilir
  - ADMIN: her şeyi yapabilir + admin paneline erişim

### admin hesabi olusturma
1. `/kayit` sayfasindan normal kayit ol
2. mevcut bir admin hesabiyla giris yap
3. `/admin/kullanicilar` → yeni hesabin rolunu "ADMIN" olarak degistir

veya dogrudan veritabanindan:
```bash
psql -d sozluk -c "UPDATE \"User\" SET role='ADMIN' WHERE username='kullaniciadi'"
```

### rapor yönetimi (`/admin/raporlar`)
- kullanıcıların şikayet ettiği entryler
- her rapor: şikayet edilen entry, şikayet eden, sebep
- **onayla**: raporu incelendi olarak işaretle
- **reddet**: raporu geçersiz olarak kapat

### başlık yönetimi (`/admin/basliklar/[slug]` API)
- başlıkları kilitle/aç (kilitli başlığa entry yazılamaz)
- başlıkları sabitle/kaldır
- başlıkları sil (tüm entry'leriyle birlikte)

---

## özellikler rehberi

### entry yazma
1. arama kutusuna başlık yaz → enter bas
2. başlık yoksa "sözlük'te böyle bir başlık yok" sayfası açılır
3. entry yaz → "yolla" butonuna bas → başlık + entry birlikte oluşturulur
4. mevcut başlığa entry yazmak için başlık sayfasının altındaki formu kullan

### entry içi formatlama
| yazım | sonuç |
|-------|-------|
| `(bkz: başlık adı)` | başlığa link |
| `` `başlık adı` `` | başlığa link (kısa) |
| `@kullaniciadi` | kullanıcıya link + bildirim |
| `*italik metin*` | *italik* |
| `https://ornek.com` | tıklanabilir link |

### oylama
- yukarı ok: beğen (upvote)
- aşağı ok: beğenme (downvote)
- tekrar tıkla: oyu geri çek
- yıldız: favorile

### bildirimler (zil ikonu)
- **etiketlenme**: biri entry'de `@senin_adin` yazdığında
- **yorum**: entry'ne yorum yapıldığında
- **beğeni**: entry'n upvote aldığında
- **takip**: biri seni takip ettiğinde
- **mesaj**: özel mesaj geldiğinde

### mesajlaşma (zarf ikonu)
- header'daki zarf ikonuna tıkla → mesaj listesi
- profil sayfasından "mesaj gönder" linki
- `/mesajlar/kullaniciadi` ile direkt sohbet

### ayarlar (`/ayarlar`)
- avatar yükle (jpg/png/webp, max 2MB)
- görünen ad değiştir
- biyografi düzenle
- şifre değiştir

### baslik takip (topic follow)
- baslik detay sayfasinda basligin yaninda "takip et" butonu var
- takip ettiginiz basliklara yeni entry girildiginde bildirim alirsiniz
- tekrar tiklanarak takipten cikilabilir

### takip sekmesi (profil)
- kullanici profil sayfasinda "takip" sekmesi var
- takip edilen kullanicilarin son entrylerini gosterir
- bir tur kisisel akis (feed) gorevi gorur

### arama
- header'daki arama kutusuna yaz
- dropdown'da mevcut başlıklar + "bu başlığı aç" seçeneği
- `/ara?q=sorgu` → başlık/entry/kullanıcı sekmeli arama

### debe (`/debe`)
- günün en beğenilen entryleri
- upvote sayısına göre sıralı

### gündem (`/gundem`)
- bugün en çok entry alan başlıklar

---

## güvenlik

- **rate limiting**: 10 başlık/saat, 30 entry/saat, 100 oy/saat
- **XSS koruması**: entry içerikleri sanitize ediliyor
- **şifreleme**: bcrypt (12 salt rounds)
- **JWT**: stateless oturum yönetimi
- **ban sistemi**: admin panelinden kullanıcı engelleme
- **rapor sistemi**: entry şikayet etme

## teknik bilgiler

- **framework**: Next.js 16 (App Router)
- **veritabanı**: PostgreSQL + Prisma ORM
- **auth**: NextAuth v5 (JWT)
- **stil**: Tailwind CSS + shadcn/ui
- **state**: Zustand (client) + TanStack Query
- **test**: vitest (ayrı test DB)

```bash
# testleri çalıştır
npm test

# veritabanını sıfırla
npx prisma migrate reset --force
npx prisma db seed

# typescript kontrolü
npx tsc --noEmit
```
