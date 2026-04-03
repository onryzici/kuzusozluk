# kuzu sözlük — güncelleme notları

## 3 nisan 2026

### yeni özellikler

**anket sistemi**
- başlık açarken anket oluşturabilirsiniz (isteğe bağlı)
- her başlıkta en fazla 1 anket olabilir
- oy verdikten sonra sonuçlar yüzdelik bar chart olarak görünür
- giriş yapmayan kullanıcılar anketi görebilir ama oy veremez

**mesaj şifreleme**
- tüm özel mesajlar artık aes-256-gcm ile şifreleniyor
- admin dahil kimse veritabanından düz metin okuyamaz
- sadece konuşmanın tarafları mesajları görebilir

**tema sistemi**
- ayarlar sayfasından 9 farklı renk teması seçilebilir
- mor, okyanus, orman, pembe, lavanta, çelik, amber, ateş, deniz
- her tema light ve dark modda farklı renk paleti kullanır
- sayfa tepesinde tema renginde ince şerit
- seçilen tema tarayıcıda saklanır

**duyuru sistemi**
- admin panelinden duyuru oluşturma/düzenleme/silme
- sabitlenmiş duyurular banner olarak gösterilir
- kapatılabilir (localStorage'da hatırlanır)
- /duyurular sayfasında tüm aktif duyurular

**bildirim sistemi genişletildi**
- bir entry'ye yorum yapıldığında, daha önce aynı entry'ye yorum yapmış herkes bildirim alır
- başlık takip edenlere yeni entry bildirimi
- @etiketleme, beğeni, takip, mesaj bildirimleri

**anket, istatistik ve daha fazlası**
- /istatistikler — platform istatistikleri (kullanıcı, entry, başlık sayıları, en aktif yazarlar)
- /sss — sık sorulan sorular sayfası
- /rastgele — rastgele bir entry gösterir
- /bebe — bugünün en beğenilen entryleri (eski debe → bebe olarak yeniden adlandırıldı)
- /online — şu an online kullanıcılar ve ne zamandır online oldukları

**çaylak ve nesil sistemi**
- yeni kayıt olan herkes çaylak olarak başlar
- çaylak entry'leri sadece admin ve moderatörler görebilir
- admin panelinden çaylak → kullanıcı yükseltme yapılabilir
- her 100 kullanıcıda nesil sayısı artar (1. nesil, 2. nesil...)
- profilde nesil badge'i görünür

---

### mobil iyileştirmeler

**yeni mobil tasarım**
- alt tab bar eklendi (ana sayfa, ara, mesajlar, bildirimler, profil)
- okunmamış mesaj ve bildirim sayıları badge olarak görünür
- mobilde ana sayfa doğrudan başlık listesi gösterir (ekşi mobil tarzı)
- başlık listesinde divider'lar ve geniş dokunma alanları
- başlık sayfasında "başlıklar" geri butonu
- mobil header'da kuzu sözlük logosu + bildirim + kullanıcı menüsü
- arama alt tab bar'dan erişilebilir, tam sayfa arama deneyimi

**mobil arama**
- arama sayfasında büyük input alanı (otomatik odaklanma)
- başlık/entry/kullanıcı sekmeleri
- sonuç bulunamazsa "bu başlığı aç" linki

---

### admin paneli

**yasaklı kelime yönetimi**
- /admin/yasakli — yasaklı kelimeleri görüntüle, ekle, kaldır
- kelime sınırı kontrolü: "apo" yasak ama "apolitik" serbest
- yasaklı kelime tespit edildiğinde hangi kelime olduğu gösterilir
- entry, başlık, yorum ve mesajlarda yasaklı kelime kontrolü

**kullanıcı yönetimi genişletildi**
- kullanıcı hesabını kalıcı olarak silme
- çaylak rolü eklendi (admin panelinden yönetilebilir)
- tüm ilişkili veriler cascade silinir

**başlık yönetimi**
- başlık sayfasında admin için üç nokta menüsü
- başlık kilitleme/açma (kilitli başlığa entry yazılamaz)
- başlık sabitleme (sidebar'da en üstte kalın olarak görünür)
- başlık silme (tüm entry'ler, anketler, yorumlar dahil cascade)

**entry yönetimi**
- admin/moderatör herhangi bir entry'yi silebilir
- entry silindikten sonra sidebar anında güncellenir
- şikayet sistemi — kullanıcılar entry'leri şikayet edebilir, admin panelinden incelenir

---

### performans

- polling konsolidasyonu: 7 http istek/30sn → 3 istek/30sn (%57 azalma)
- sidebar optimizasyonu: her sayfa geçişinde refetch kaldırıldı
- veritabanı sorgu optimizasyonları (paralel sorgular, gereksiz veri azaltma)
- loading skeleton'lar eklendi (son, takip, kullanıcı, gündem sayfaları)
- lucide-react ve date-fns tree-shaking optimize edildi
- next.js compress ve reactStrictMode aktif

---

### güvenlik

- mesajlar aes-256-gcm ile şifreleniyor
- yasaklı kelime filtresi (kelime sınırı kontrolüyle)
- rate limiting: 60 başlık, 120 entry, 300 oy/saat
- xss koruması (sanitizeInput + escapeHtml)
- entry silme cascade (foreign key hatası düzeltildi)
- ban sistemi (giriş + middleware kontrolü)
- hesap silme sadece admin için

---

### diğer düzeltmeler

- lowercase zorlama: tüm içerikler otomatik küçük harfe dönüştürülür
- sidebar entry sayısı gerçek db count ile gösteriliyor
- tüm sayfalarda yorum sayısı (yorumlar (3)) görünür
- entry düzenleme ui (üç nokta menüsünden)
- karma hesaplama (upvote = +1, geri çekme = -1)
- sıralama + sayfalama aynı satırda
- entry gönderildi/başlık oluşturuldu toast bildirimleri
- kayıt başarı sayfası animasyonlu geçiş
- 404 sayfası — robot kuzu görseli + komik metin
- entry içi formatlama: bkz, @mention, bold, italic, spoiler, link, görsel (tıkla aç/kapa)
- profilde takip sekmesi — takip edilen kullanıcı listesi
- sabitlenmiş başlıklar sidebar'da en üstte + kalın
- arama dropdown z-index düzeltmesi
- iphone safe area padding
