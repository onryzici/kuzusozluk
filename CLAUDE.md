# CLAUDE.md — Sosyal Sözlük Projesi

Bu dosya Claude Code'un projeyi doğru anlayıp uygulayabilmesi için yazılmıştır.  
Ekşi Sözlük'e benzer, kullanıcı güdümlü bir Türkçe sosyal sözlük sitesidir.

---

## Proje Özeti

Kullanıcıların **başlık** (topic) oluşturabildiği, her başlığa **entry** yazabildiği,  
entryleri oylayabildiği ve birbiriyle etkileşime girebildiği bir platform.  
Modern, performanslı ve ölçeklenebilir olmalıdır.

---

## Teknoloji Yığını (Tech Stack)

### Frontend
| Paket | Versiyon | Amaç |
|-------|----------|-------|
| `next` | 14+ | App Router, SSR, SSG |
| `typescript` | 5+ | Tip güvenliği |
| `tailwindcss` | 3+ | Utility-first CSS |
| `@shadcn/ui` | latest | Accessible UI bileşenleri |
| `@tanstack/react-query` | 5+ | Server state, cache, infinite scroll |
| `zustand` | 4+ | Client-side global state (sidebar, modal, tema) |
| `react-hook-form` | 7+ | Form yönetimi |
| `zod` | 3+ | Schema validasyon (form + API) |
| `next-themes` | latest | Dark/light mod |
| `date-fns` | 3+ | Tarih formatlama (Türkçe locale) |
| `lucide-react` | latest | İkon seti |

### Backend (Next.js API Routes)
| Paket | Versiyon | Amaç |
|-------|----------|-------|
| `next-auth` | 5 (beta) | Kimlik doğrulama, JWT, session |
| `@prisma/client` | 5+ | Type-safe ORM |
| `prisma` | 5+ | Migrations, schema |
| `bcryptjs` | latest | Şifre hashleme |
| `ioredis` | latest | Redis client (cache, rate limit) |
| `meilisearch` | latest | Arama motoru client |
| `cloudinary` | latest | Medya yükleme |
| `nodemailer` | latest | E-posta (aktivasyon, şifre sıfırlama) |
| `@upstash/ratelimit` | latest | API rate limiting |

### Veritabanı & Altyapı
- **PostgreSQL 16** — Ana veritabanı (Railway veya Supabase üzerinde)
- **Redis** — Cache, oturum blacklist, rate limiting (Upstash ücretsiz tier)
- **Meilisearch** — Full-text başlık & entry arama (Railway üzerinde veya Meilisearch Cloud)
- **Cloudinary** — Avatar ve varsa medya depolama

### Deploy
- **Vercel** — Next.js uygulaması
- **Railway** — PostgreSQL + Meilisearch (veya Supabase + Meilisearch Cloud)
- **Upstash** — Redis

---

## Proje Yapısı (Klasör Ağacı)

```
/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth grup rotaları (layout ayrı)
│   │   ├── giris/page.tsx        # Login sayfası
│   │   ├── kayit/page.tsx        # Register sayfası
│   │   └── sifre-sifirla/page.tsx
│   ├── (main)/                   # Ana grup rotaları (header/sidebar var)
│   │   ├── layout.tsx            # Ana layout (header + sidebar)
│   │   ├── page.tsx              # Anasayfa (gündem)
│   │   ├── baslik/
│   │   │   ├── [slug]/
│   │   │   │   ├── page.tsx      # Başlık detay sayfası (entryler)
│   │   │   │   └── loading.tsx
│   │   │   └── yeni/page.tsx     # Yeni başlık oluştur
│   │   ├── entry/
│   │   │   └── [id]/page.tsx    # Tek entry permalink
│   │   ├── kullanici/
│   │   │   └── [username]/
│   │   │       ├── page.tsx      # Kullanıcı profil sayfası
│   │   │       └── entryler/page.tsx
│   │   ├── ara/page.tsx          # Arama sonuçları
│   │   ├── gundem/page.tsx       # Trending başlıklar
│   │   └── ayarlar/page.tsx      # Hesap ayarları
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── baslik/
│   │   │   ├── route.ts          # GET (liste), POST (yeni)
│   │   │   └── [slug]/
│   │   │       ├── route.ts      # GET (detay), PATCH, DELETE
│   │   │       └── entry/route.ts # POST (yeni entry)
│   │   ├── entry/
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET, PATCH, DELETE
│   │   │       ├── oy/route.ts   # POST (upvote/downvote)
│   │   │       └── favori/route.ts
│   │   ├── kullanici/
│   │   │   └── [username]/route.ts
│   │   ├── ara/route.ts          # Arama endpoint
│   │   └── upload/route.ts       # Cloudinary upload
│   ├── globals.css
│   └── layout.tsx                # Root layout
│
├── components/
│   ├── ui/                       # shadcn/ui primitive bileşenler
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx           # Sol sidebar (gündem, kategoriler)
│   │   └── Footer.tsx
│   ├── baslik/
│   │   ├── BaslikKart.tsx        # Başlık liste kartı
│   │   ├── BaslikDetay.tsx       # Başlık başlığı + meta
│   │   └── YeniBaslikForm.tsx
│   ├── entry/
│   │   ├── EntryKart.tsx         # Tek entry görünümü
│   │   ├── EntryListesi.tsx      # Sayfalı entry listesi
│   │   ├── EntryForm.tsx         # Entry yazma/düzenleme formu
│   │   └── OyButonlari.tsx       # Upvote/downvote
│   ├── kullanici/
│   │   ├── ProfilKart.tsx
│   │   └── AvatarYukle.tsx
│   └── shared/
│       ├── AramaKutusu.tsx
│       ├── Sayfalama.tsx
│       └── BosSayfa.tsx
│
├── lib/
│   ├── prisma.ts                 # Prisma singleton client
│   ├── redis.ts                  # Redis/Upstash client
│   ├── meilisearch.ts            # Meilisearch client
│   ├── auth.ts                   # NextAuth konfigürasyonu
│   ├── cloudinary.ts             # Cloudinary konfigürasyonu
│   ├── validations/              # Zod şemaları
│   │   ├── auth.ts
│   │   ├── baslik.ts
│   │   └── entry.ts
│   └── utils/
│       ├── slug.ts               # Türkçe karakter → slug dönüşümü
│       ├── format.ts             # Tarih, sayı formatlama
│       └── cn.ts                 # clsx + tailwind-merge
│
├── hooks/
│   ├── useOturum.ts              # useSession wrapper
│   ├── useEntryler.ts            # TanStack Query infinite scroll
│   ├── useOylama.ts              # Optimistic oy güncelleme
│   └── useArama.ts               # Debounced arama
│
├── store/
│   └── uiStore.ts                # Zustand (sidebar aç/kapat, tema)
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                   # Örnek veri
│
├── types/
│   └── index.ts                  # Global TypeScript tipleri
│
├── middleware.ts                  # Auth koruması, rate limiting
├── next.config.ts
├── tailwind.config.ts
└── .env.example
```

---

## Veritabanı Şeması (Prisma)

`prisma/schema.prisma` dosyası aşağıdaki modelleri içermelidir:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  username      String    @unique @db.VarChar(30)
  email         String    @unique
  passwordHash  String
  displayName   String?   @db.VarChar(50)
  bio           String?   @db.Text
  avatarUrl     String?
  role          Role      @default(USER)
  isActive      Boolean   @default(false)  // email onayı gerekli
  karma         Int       @default(0)
  entryCount    Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  entries       Entry[]
  upvotes       Vote[]    @relation("Upvoter")
  favorites     Favorite[]
  following     Follow[]  @relation("Follower")
  followers     Follow[]  @relation("Following")
  messages      Message[] @relation("Sender")

  @@index([username])
  @@index([karma])
}

enum Role {
  USER
  AUTHOR    // Onaylı yazar (entry yazabilir)
  MODERATOR
  ADMIN
}

model Topic {
  id          String    @id @default(cuid())
  title       String    @unique @db.VarChar(200)
  slug        String    @unique @db.VarChar(220)
  description String?   @db.Text
  entryCount  Int       @default(0)
  dayCount    Int       @default(0)  // bugünkü entry sayısı (gündem için)
  isPinned    Boolean   @default(false)
  isLocked    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  entries     Entry[]
  tags        TopicTag[]

  @@index([slug])
  @@index([dayCount])
  @@index([entryCount])
}

model Entry {
  id          String    @id @default(cuid())
  content     String    @db.Text
  upvotes     Int       @default(0)
  downvotes   Int       @default(0)
  isEdited    Boolean   @default(false)
  isPinned    Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  author      User      @relation(fields: [authorId], references: [id])
  authorId    String
  topic       Topic     @relation(fields: [topicId], references: [id])
  topicId     String

  votes       Vote[]
  favorites   Favorite[]

  @@index([topicId, createdAt])
  @@index([authorId])
  @@index([upvotes])
}

model Vote {
  id        String    @id @default(cuid())
  type      VoteType
  createdAt DateTime  @default(now())

  user      User      @relation("Upvoter", fields: [userId], references: [id])
  userId    String
  entry     Entry     @relation(fields: [entryId], references: [id])
  entryId   String

  @@unique([userId, entryId])
  @@index([entryId])
}

enum VoteType {
  UP
  DOWN
}

model Favorite {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id])
  userId    String
  entry     Entry    @relation(fields: [entryId], references: [id])
  entryId   String

  @@unique([userId, entryId])
}

model Follow {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())

  follower    User     @relation("Follower", fields: [followerId], references: [id])
  followerId  String
  following   User     @relation("Following", fields: [followingId], references: [id])
  followingId String

  @@unique([followerId, followingId])
}

model Tag {
  id     String     @id @default(cuid())
  name   String     @unique @db.VarChar(50)
  topics TopicTag[]
}

model TopicTag {
  topic   Topic  @relation(fields: [topicId], references: [id])
  topicId String
  tag     Tag    @relation(fields: [tagId], references: [id])
  tagId   String

  @@id([topicId, tagId])
}

model Message {
  id          String   @id @default(cuid())
  content     String   @db.Text
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  sender      User     @relation("Sender", fields: [senderId], references: [id])
  senderId    String
  receiverId  String
}
```

---

## API Tasarımı

### Başlıklar
```
GET    /api/baslik                      # Liste (paginated, filtreli)
POST   /api/baslik                      # Yeni başlık (auth gerekli)
GET    /api/baslik/[slug]               # Başlık detayı
PATCH  /api/baslik/[slug]               # Güncelle (moderatör)
DELETE /api/baslik/[slug]               # Sil (moderatör)
POST   /api/baslik/[slug]/entry         # Başlığa entry yaz (auth gerekli)
```

### Entryler
```
GET    /api/entry/[id]                  # Tek entry
PATCH  /api/entry/[id]                  # Düzenle (kendi entry'si)
DELETE /api/entry/[id]                  # Sil (kendi veya moderatör)
POST   /api/entry/[id]/oy               # Oy ver { type: "UP" | "DOWN" }
DELETE /api/entry/[id]/oy               # Oyu geri al
POST   /api/entry/[id]/favori           # Favorilere ekle
DELETE /api/entry/[id]/favori           # Favorilerden çıkar
```

### Kullanıcı
```
GET    /api/kullanici/[username]         # Profil bilgisi
GET    /api/kullanici/[username]/entryler
POST   /api/kullanici/[username]/takip  # Takip et
DELETE /api/kullanici/[username]/takip  # Takipten çık
```

### Arama
```
GET    /api/ara?q=...&tip=baslik|entry|kullanici
```

### Auth
```
POST   /api/auth/kayit
POST   /api/auth/giris
GET    /api/auth/[...nextauth]
POST   /api/auth/aktivasyon
POST   /api/auth/sifre-sifirla
```

### API Response Formatı (tutarlı olmalı)
```typescript
// Başarı
{ success: true, data: T, meta?: { total, page, pageSize, hasMore } }

// Hata
{ success: false, error: { code: string, message: string } }
```

---

## Kimlik Doğrulama (NextAuth v5)

`lib/auth.ts` dosyasında:
- **Credentials Provider** kullanılacak (email + şifre)
- JWT stratejisi (stateless)
- Session'da `id`, `username`, `role`, `karma` bilgileri taşınacak
- Şifreler `bcryptjs` ile hashlenecek (saltRounds: 12)
- E-posta aktivasyonu: kayıt sonrası `nodemailer` ile link gönderilecek
- **middleware.ts** route koruması: `/ayarlar`, `/mesajlar`, `/api/baslik POST`, `/api/entry` yazma işlemleri auth gerektirir

---

## Slug Sistemi

`lib/utils/slug.ts` içinde Türkçe karakterleri destekleyen slug:

```typescript
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
```

Başlık oluşturulurken slug unique kontrol yapılmalı; çakışma varsa sonuna `-2`, `-3` eklenmeli.

---

## Cache Stratejisi (Redis)

```typescript
// Önbellek süreleri
const TTL = {
  GUNDEM:     60 * 5,      // 5 dakika
  BASLIK:     60 * 60,     // 1 saat
  KULLANICI:  60 * 15,     // 15 dakika
  ARAMA:      60 * 2,      // 2 dakika
}

// Key formatları
`baslik:${slug}`
`gundem:list`
`user:${username}`
`search:${query}`
`rlimit:${ip}:${endpoint}`
```

**Cache invalidation:** Entry yazıldığında veya başlık güncellendiğinde ilgili cache silinmeli.

---

## Arama (Meilisearch)

### Index'ler
1. `topics` — `title`, `description` aranabilir; `entryCount`, `dayCount` filtrelenebilir
2. `entries` — `content`, `authorUsername` aranabilir; `topicSlug`, `createdAt` filtrelenebilir

### `lib/meilisearch.ts`
```typescript
import { MeiliSearch } from 'meilisearch'

export const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST!,
  apiKey: process.env.MEILISEARCH_API_KEY!,
})

// Topic indexini başlat
export async function setupIndexes() {
  await meili.index('topics').updateSettings({
    searchableAttributes: ['title', 'description'],
    filterableAttributes: ['entryCount', 'dayCount'],
    sortableAttributes: ['entryCount', 'dayCount', 'createdAt'],
    rankingRules: ['words', 'typo', 'attribute', 'sort', 'exactness'],
  })
}
```

Entry veya başlık oluşturulduğunda/güncellendiğinde Meilisearch'e de senkron yazılmalı.

---

## Rate Limiting

`middleware.ts` veya API route'larında:
- `POST /api/baslik`: 10 istek / saat / kullanıcı
- `POST /api/baslik/[slug]/entry`: 30 istek / saat / kullanıcı
- `POST /api/entry/[id]/oy`: 100 istek / saat / kullanıcı
- `POST /api/auth/giris`: 5 istek / 15 dakika / IP

`@upstash/ratelimit` + Redis sliding window algoritması kullanılacak.

---

## UI / UX Gereksinimleri

### Genel Tasarım İlkeleri
- Ekşi Sözlük'e benzer ama daha modern ve temiz
- Renk paleti: Yeşil primary (`#2d6a4f` veya benzeri), beyaz arka plan, gri detaylar
- Dark mode desteği (`next-themes`)
- Tamamen responsive (mobile-first)
- Türkçe arayüz (tüm metinler)

### Sayfa Düzeni
```
┌────────────────────────────────────────────────┐
│                   HEADER                        │
│  [Logo]  [Arama kutusu]  [Giriş/Kullanıcı]    │
├──────────────┬─────────────────────────────────┤
│   SIDEBAR    │           CONTENT               │
│   • Gündem   │  (Başlık detayı / Entryler)     │
│   • Takip    │                                  │
│   • Popüler  │                                  │
└──────────────┴─────────────────────────────────┘
```

### Header
- Logo (sol), büyük arama input'u (orta), giriş yap / kullanıcı menüsü (sağ)
- Arama: `/api/ara` üzerinden Meilisearch'e gider, anlık öneri dropdown'ı açılır

### Sol Sidebar
- **Gündem:** Entry sayısı en fazla olan bugünkü başlıklar (dayCount'a göre)
- **Takip ettiğim başlıklar** (giriş yapılıysa)
- **Rastgele başlık** butonu

### Başlık Detay Sayfası (`/baslik/[slug]`)
- Başlık metni büyük, altında meta bilgi (entry sayısı, oluşturulma tarihi)
- Entry listesi: varsayılan olarak en eskiden yeniye, sıralama değiştirilebilir
- Her sayfada 10 entry
- Sayfalama: URL param `?sayfa=2`
- **Entry kartı:** Yazar linki + tarih (sağ alt), oy butonları (sağ), favori (sağ)

### Entry Formu
- Markdown destekli basit textarea (kalın, italik, link)
- Karakter sayacı (max 5000)
- Önizleme modu
- Entry kaydedildiğinde sayfa yenilenmeden listeye eklenmeli (optimistic update)

### Kullanıcı Profili (`/kullanici/[username]`)
- Avatar, kullanıcı adı, katılım tarihi, entry sayısı, karma
- Son entryler sekmesi
- Favori entryler sekmesi
- Takip et butonu (giriş yapılıysa, kendisi değilse)

### Oylama (Optimistic UI)
- Oy verildiğinde UI anında güncellenmeli
- API başarısız olursa geri alınmalı
- Aynı oya tekrar tıklamak oyu geri çeker

---

## Environment Değişkenleri (`.env.example`)

```env
# Veritabanı
DATABASE_URL="postgresql://user:password@host:5432/sozluk"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="super-secret-key-change-in-production"

# Redis (Upstash)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Meilisearch
MEILISEARCH_HOST="http://localhost:7700"
MEILISEARCH_API_KEY="masterKey"

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# E-posta (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASS="..."
EMAIL_FROM="noreply@sozluk.com"
```

---

## Geliştirme Sırası (Öncelik Sırası)

Claude Code aşağıdaki sırayla geliştirmeli:

1. **Temel kurulum**
   - `npx create-next-app@latest` (TypeScript, Tailwind, App Router)
   - Shadcn/ui kurulumu
   - Prisma + PostgreSQL bağlantısı
   - `.env` dosyaları

2. **Veritabanı**
   - `prisma/schema.prisma` modelleri oluştur
   - `prisma migrate dev` çalıştır
   - `seed.ts` ile örnek veri yükle

3. **Auth sistemi**
   - NextAuth yapılandırması
   - Register / Login sayfaları ve API route'ları
   - Middleware ile route koruması
   - E-posta aktivasyon akışı

4. **Başlık sistemi**
   - API: Başlık oluştur, listele, detay al
   - UI: Ana sayfa, başlık detay sayfası
   - Slug üretimi

5. **Entry sistemi**
   - API: Entry oluştur, düzenle, sil
   - UI: Entry listesi, entry formu, sayfalama
   - Infinite scroll veya geleneksel sayfalama

6. **Oylama & favoriler**
   - API: Oy ver/geri çek, favorile
   - Optimistic UI güncellemeleri

7. **Arama**
   - Meilisearch kurulumu ve index'leri
   - Arama API endpoint'i
   - Header arama kutusu + öneri dropdown'ı

8. **Kullanıcı profili**
   - Profil sayfası
   - Takip sistemi

9. **Gündem / sidebar**
   - dayCount güncellemesi (cron veya DB trigger)
   - Gündem listesi

10. **Optimizasyon & polish**
    - Redis cache ekleme
    - Rate limiting
    - SEO (meta, og tags)
    - Error boundary'ler
    - Loading skeleton'lar

---

## Önemli Notlar

- **Tüm API route'ları** Zod şemasıyla validate edilmeli; geçersiz input `400` döndürmeli.
- **Prisma client** `lib/prisma.ts` içinde singleton olarak oluşturulmalı (dev'de hot reload sorununu önlemek için global check).
- **Meilisearch senkronizasyonu** Prisma'nın middleware/hook'ları yerine API katmanında manuel yapılmalı.
- **Türkçe karakter sorunu**: Sluglarda ve aramada Türkçe karakter dönüşümü her yerde tutarlı uygulanmalı.
- **Entry içeriği**: XSS önlemi için `DOMPurify` veya benzer bir kütüphane ile sanitize edilmeli.
- **Görseller**: `next/image` bileşeni kullanılmalı, Cloudinary URL'leri `next.config.ts`'e eklenmeli.
- **Sayfalama**: API her zaman `{ data, meta: { total, page, pageSize, hasMore } }` döndürmeli.
- **Test**: Her önemli API endpoint için en az bir temel test yazılmalı (`vitest` önerilir).
- **Commit mesajları**: Türkçe veya İngilizce, semantic commit formatında (`feat:`, `fix:`, `chore:`).

---

## Başlarken (İlk Komutlar)

```bash
# Projeyi oluştur
npx create-next-app@latest sozluk --typescript --tailwind --app --src-dir no

cd sozluk

# Shadcn/ui ekle
npx shadcn@latest init

# Temel shadcn bileşenlerini ekle
npx shadcn@latest add button input textarea card avatar badge dropdown-menu dialog toast

# Prisma kur
npm install prisma @prisma/client
npx prisma init

# Diğer paketler
npm install next-auth@beta @auth/prisma-adapter
npm install @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers zod
npm install bcryptjs ioredis meilisearch
npm install @upstash/ratelimit @upstash/redis
npm install cloudinary
npm install date-fns
npm install next-themes lucide-react
npm install nodemailer
npm install -D @types/bcryptjs @types/nodemailer

# Prisma migrate
npx prisma migrate dev --name init
npx prisma db seed
```
