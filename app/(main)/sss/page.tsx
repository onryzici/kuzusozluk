import { HelpCircle, ChevronDown } from "lucide-react";

const faqItems = [
  {
    question: "nasil kayit olunur?",
    answer:
      'sag ustteki "giris" butonuna tiklayarak kayit sayfasina ulasabilirsiniz. kullanici adinizi, e-posta adresinizi ve sifrenizi girerek kayit olabilirsiniz. kayit isleminden sonra e-posta adresinize gelen aktivasyon linkine tiklayarak hesabinizi aktif etmeniz gerekir.',
  },
  {
    question: "entry nasil yazilir?",
    answer:
      "bir basliga girdikten sonra sayfanin altindaki metin kutusuna entryinizi yazabilirsiniz. entryler en az 1, en fazla 5000 karakter uzunlugunda olabilir. giris yapmis olmaniz gerekir.",
  },
  {
    question: "bkz nedir?",
    answer:
      'bkz, "bakiz" anlamina gelir ve baska bir basliga referans vermek icin kullanilir. entry yazarken (bkz: baslik adi) formatini kullanarak baska bir basliga link verebilirsiniz.',
  },
  {
    question: "@etiketleme nasil calisir?",
    answer:
      "entry yazarken @kullaniciadi formatini kullanarak baska bir kullaniciyi etiketleyebilirsiniz. etiketlenen kullaniciya bildirim gonderilir.",
  },
  {
    question: "karma nedir?",
    answer:
      "karma, entrylerinize gelen oylardan hesaplanan bir puandir. entryiniz begeni aldiginda karmaniz artar, olumsuz oy aldiginda azalir. yuksek karmali kullanicilarin topluluk icindeki gozle gorulurlugu daha yuksektir.",
  },
  {
    question: "caylak nedir?",
    answer:
      "yeni kayit olan kullanicilar caylak statusundedir. caylaklar entry yazabilir ancak bazi gelismis ozelliklere erisim kisitli olabilir. belirli bir karma ve entry sayisina ulastiktan sonra caylak statusundan cikilir.",
  },
  {
    question: "baslik nasil takip edilir?",
    answer:
      'bir basligin detay sayfasina girdikten sonra basligin yanindaki "takip et" butonuna tiklayarak o basligi takip edebilirsiniz. takip ettiginiz basliklara yeni entry yazildiginda bildirim alirsiniz.',
  },
  {
    question: "bebe nedir?",
    answer:
      'bebe, "bugünün en beğenilen entryleri" anlamına gelir. en çok beğeni alan entryler bebe listesinde yer alır.',
  },
  {
    question: "nasil admin olunur?",
    answer:
      "admin yetkileri site yoneticileri tarafindan verilir. platform kurallarini takip eden, toplulugun gelisimine katki saglayan ve sorumlu davranan kullanicilar moderator veya admin olarak atanabilir.",
  },
];

export default function SSSPage() {
  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <HelpCircle className="h-4 w-4 text-primary" />
        <h1 className="text-base font-medium text-foreground">
          sikca sorulan sorular
        </h1>
      </div>

      <div className="space-y-1">
        {faqItems.map((item, index) => (
          <details key={index} className="group border-b border-border/40">
            <summary className="flex items-center justify-between cursor-pointer py-3 text-sm text-foreground hover:text-primary transition-colors list-none">
              <span>{item.question}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="pb-3 text-[13px] text-muted-foreground leading-relaxed">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
