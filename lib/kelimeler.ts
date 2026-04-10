// 5 harfli Türkçe kelime listesi (kelimelik oyunu için)
// Tüm kelimeler küçük harf, lokal olarak depolanır.
export const KELIMELER_5: string[] = [
  "akşam", "altın", "anlam", "araba", "artık", "asker", "ayrık",
  "aşure", "bakım", "balık", "bazen", "bekle", "bilek", "biraz",
  "bizim", "böyle", "bütün", "canlı", "ceket", "cesur", "cevap",
  "cezve", "çabuk", "çakal", "çamur", "çanta", "çatal", "çayır",
  "çelik", "çevre", "çıkın", "çiçek", "çilek", "çizgi", "çoban",
  "çocuk", "çorba", "daire", "damar", "damla", "davet", "davul",
  "demir", "deniz", "deyim", "doğal", "doğru", "dolap", "domuz",
  "dönem", "duvar", "düşme", "düşük", "düzey", "ekmek", "elbet",
  "emlak", "endam", "erkek", "evren", "fakat", "fasıl", "fazla",
  "fener", "fıkra", "fırın", "garez", "garip", "gazel", "gazoz",
  "gelir", "genel", "gerek", "geyik", "gezme", "giriş", "gölge",
  "gönül", "görev", "gümüş", "güneş", "haber", "hafif", "hakim",
  "halat", "halay", "halka", "hamak", "hamur", "hangi", "harap",
  "harem", "hasat", "hasır", "hasta", "haşin", "hatun", "havlu",
  "havuç", "havuz", "hayal", "hayat", "hayır", "helva", "hemen",
  "hesap", "heyet", "hızlı", "hindi", "horoz", "hücre", "hüküm",
  "imkan", "inanç", "insan", "işgal", "işsiz", "kabul", "kabuk",
  "kabus", "kaçış", "kader", "kafes", "kalem", "kalın", "kamış",
  "kanat", "kapak", "kapan", "kaplı", "kaput", "karar", "karne",
  "kasap", "katar", "kavak", "kavga", "kayak", "kayık", "kazak",
  "kazan", "kazma", "kefen", "kelle", "kemik", "kenar", "keten",
  "kırık", "kırış", "kırma", "kısım", "kıvam", "kibar", "kilim",
  "kilit", "kimse", "kiraz", "kitap", "kolay", "kolye", "konak",
  "konuk", "konum", "konut", "kopya", "koruk", "köpek", "köprü",
  "kömür", "kütle", "lazım", "limon", "liman", "maden", "madde",
  "maddi", "mahal", "makas", "mantı", "masaj", "masal", "masum",
  "mayıs", "mayın", "melek", "merak", "meyve", "mezar", "miras",
  "misal", "modem", "molla", "motor", "mucit", "muska", "mutlu",
  "müzik", "nakit", "namaz", "namlu", "nasıl", "neden", "nehir",
  "nesne", "niyet", "ölçek", "önder", "öneri", "önlem", "önsöz",
  "örnek", "öksüz", "üzgün", "pamuk", "panik", "pazar", "perde",
  "petek", "pilav", "piliç", "prens", "radyo", "rahat", "reçel",
  "resim", "robot", "saban", "sabit", "sabun", "sahip", "sakal",
  "salon", "sanat", "sapan", "sarık", "savaş", "saygı", "sayım",
  "sebep", "sebze", "secde", "seçim", "selam", "semer", "sepet",
  "sergi", "sezon", "sıcak", "sıfır", "sınır", "silah", "silgi",
  "simge", "sinek", "sirke", "siyah", "sofra", "sokak", "soluk",
  "somut", "somun", "sonra", "sorgu", "sorun", "subay", "süreç",
  "süslü", "şahıs", "şarkı", "şehir", "şimdi", "tabak", "tabip",
  "tahta", "takım", "talim", "tanrı", "tartı", "tatil", "tavan",
  "tavla", "tavus", "teker", "temel", "temiz", "tepsi", "terim",
  "terör", "tilki", "toplu", "topuk", "tuhaf", "tuzak", "türev",
  "türkü", "ucube", "unsur", "uzman", "vakit", "vapur", "varış",
  "varsa", "vatan", "vezir", "yakın", "yalan", "yanıt", "yapım",
  "yarış", "yaşam", "yatak", "yavru", "yayan", "yayın", "yazar",
  "yazgı", "yelek", "yemek", "yemin", "yetki", "yıkım", "yılan",
  "yiğit", "yokuş", "yorum", "yumak", "yumru", "yünlü", "yüzde",
  "yüzük", "zafer", "zalim", "zaman", "zarar", "zayıf", "zehir",
  "zinde", "zorba", "zorla", "şahin", "şakak", "şahit", "şamar",
  "şapka", "şarap", "şüphe", "şimal",
];

// Tahmin için geçerli kelime listesi (target listesi + ek kelimeler)
// Tahmin amaçlı geniş, target ise yukarıdaki ana liste
export const VALID_GUESSES = new Set(KELIMELER_5);

export function rastgeleKelime(): string {
  return KELIMELER_5[Math.floor(Math.random() * KELIMELER_5.length)];
}

export function gecerliKelimeMi(kelime: string): boolean {
  return VALID_GUESSES.has(kelime.toLowerCase());
}
