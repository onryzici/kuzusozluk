import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: "ahmet",
        email: "ahmet@example.com",
        passwordHash: hashSync("Sifre123!", 12),
        displayName: "Ahmet Yılmaz",
        bio: "Yazılımcı, kitap kurdu",
        role: "AUTHOR",
        isActive: true,
        karma: 150,
      },
    }),
    prisma.user.create({
      data: {
        username: "elif",
        email: "elif@example.com",
        passwordHash: hashSync("Sifre123!", 12),
        displayName: "Elif Kaya",
        bio: "Felsefe öğrencisi",
        role: "AUTHOR",
        isActive: true,
        karma: 85,
      },
    }),
    prisma.user.create({
      data: {
        username: "mehmet",
        email: "mehmet@example.com",
        passwordHash: hashSync("Sifre123!", 12),
        displayName: "Mehmet Demir",
        bio: "Müzisyen, gezgin",
        role: "ADMIN",
        isActive: true,
        karma: 300,
      },
    }),
  ]);

  const [ahmet, elif, mehmet] = users;

  const topicsData = [
    { title: "yazılım öğrenmeye nereden başlanır", slug: "yazilim-ogrenmeye-nereden-baslanir" },
    { title: "en iyi türk filmleri", slug: "en-iyi-turk-filmleri" },
    { title: "istanbul'da yaşamanın zorlukları", slug: "istanbulda-yasmanin-zorluklari" },
    { title: "uzay araştırmaları", slug: "uzay-arastirmalari" },
    { title: "kahve çeşitleri", slug: "kahve-cesitleri" },
    { title: "kitap önerileri 2026", slug: "kitap-onerileri-2026" },
    { title: "yapay zeka ve gelecek", slug: "yapay-zeka-ve-gelecek" },
    { title: "en güzel kamp yerleri", slug: "en-guzel-kamp-yerleri" },
    { title: "türk mutfağının gizli lezzetleri", slug: "turk-mutfaginin-gizli-lezzetleri" },
    { title: "remote çalışmanın avantajları", slug: "remote-calismanin-avantajlari" },
  ];

  const topics = await Promise.all(
    topicsData.map((t) => prisma.topic.create({ data: t }))
  );

  const entryContents = [
    "Bu konuda ilk adım olarak Python öğrenmeni tavsiye ederim. Hem kolay hem de iş imkanı çok.",
    "Freecodecamp ve Odin Project ile başlayabilirsin, tamamen ücretsiz.",
    "Bence direkt proje yaparak öğrenmek en iyisi. Teoriyle boğulma.",
    "Nuri Bilge Ceylan filmleri bu listenin başında olmalı. Kış Uykusu başyapıt.",
    "Yılmaz Güney'in Yol filmi hâlâ aşılamamış bir şaheser.",
    "Ezel dizisi bile birçok filmden iyidir, onu da ekleyelim bari.",
    "Kira + ulaşım derken maaşın yarısı gidiyor. Ama iş imkanı başka yerde yok.",
    "Trafik cehennemi... Ama İstanbul'un enerjisi bambaşka, bırakamıyorsun.",
    "Deprem riski en büyük kaygı. Hazırlıklı olmak şart.",
    "Mars'a insan göndermek artık hayal değil, SpaceX buna çok yakın.",
    "James Webb teleskobu sayesinde evrenin sırları bir bir ortaya çıkıyor.",
    "Türkiye'nin uzay programı da gelişiyor, TURKSAT-6A büyük bir adım.",
    "V60 ile demleme kahve tadına doyum olmaz. Biraz zahmetli ama değer.",
    "Türk kahvesi her zaman bir numara. Dibek kahvesini de deneyin.",
    "Soğuk demleme yaz aylarının vazgeçilmezi. 12 saat bekletme şart.",
    "Sabahattin Ali - Kürk Mantolu Madonna hâlâ çok güncel.",
    "İngilizce okuyorsanız Project Hail Mary (Andy Weir) harika.",
    "Türkçe bilim kurgu isteyenlere Barış Müstecaplıoğlu'nu öneriyorum.",
    "GPT modelleri inanılmaz gelişti ama AGI'ye daha çok var.",
    "Yapay zeka sanatı öldürür mü tartışması bitmiyor.",
    "Otomasyon birçok mesleği değiştirecek ama yeni meslekler de doğacak.",
    "Kaçkar Dağları'nda kamp yapmak unutulmaz bir deneyim.",
    "Olympos sahili hâlâ en güzel kamp yeri bence.",
    "Çıralı'da karetta karettaları izlerken kamp yapmak müthiş.",
    "Kayseri mantısı dışında mantı diye bir şey yok.",
    "Antep mutfağı tek başına bir dünya mutfağı. Lahmacun, kebap, baklava...",
    "Karadeniz mutfağının muhlama'sı ve kuymağı keşfedilmeyi bekliyor.",
    "Evden çalışmak özgürlük. Kendi programını kendin yapıyorsun.",
    "Ama sosyal izolasyon riski var, co-working space'ler çözüm olabilir.",
    "Remote çalışma sayesinde farklı şehirlerde yaşayabiliyorsun, harika.",
  ];

  let entryIndex = 0;
  for (const topic of topics) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const author = users[i % 3];
      await prisma.entry.create({
        data: {
          content: entryContents[entryIndex],
          authorId: author.id,
          topicId: topic.id,
        },
      });
      entryIndex++;
    }
    await prisma.topic.update({
      where: { id: topic.id },
      data: { entryCount: count, dayCount: Math.floor(Math.random() * 10) },
    });
  }

  // Kullanıcı entry sayılarını güncelle
  for (const user of users) {
    const c = await prisma.entry.count({ where: { authorId: user.id } });
    await prisma.user.update({ where: { id: user.id }, data: { entryCount: c } });
  }

  // Takipler
  await prisma.follow.create({ data: { followerId: ahmet.id, followingId: elif.id } });
  await prisma.follow.create({ data: { followerId: elif.id, followingId: mehmet.id } });

  console.log("Seed tamamlandı: 3 kullanıcı, 10 başlık, 30 entry oluşturuldu.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
