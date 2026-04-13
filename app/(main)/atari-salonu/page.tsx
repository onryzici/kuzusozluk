import Link from "next/link";
import { Gamepad2 } from "lucide-react";

export const metadata = {
  title: "atari salonu - kuzusozluk",
  description: "mini oyunlar oyna, skor kas, yazarlar arasinda birinci ol",
};

const oyunlar = [
  {
    slug: "dino",
    title: "dino-tml",
    description: "tml kosuyor. tombul siselerden kac, skor kas.",
    emoji: "🦕",
  },
  {
    slug: "pacman",
    title: "pacman",
    description: "noktlari ye, hayaletlerden kac. her seviye daha hizli.",
    emoji: "👾",
  },
  {
    slug: "tetris",
    title: "tetris",
    description: "satirlari tamamla, seviye atla. klasik tetris deneyimi.",
    emoji: "🧱",
  },
  {
    slug: "monkey",
    title: "prenses korcagin'i döv",
    description: "prenses korcagin'i tokatla. ne kadar hizli vurursan o kadar uzaga gider!",
    emoji: "🦅",
  },
  {
    slug: "fruit-ninja",
    title: "fruit ninja",
    description: "meyveleri kes, bombalardan kac. 3 meyve kacirirsan biter!",
    emoji: "🍉",
  },
  {
    slug: "solucan",
    title: "yilan seven solucan",
    description: "yemekleri topla, buyumeye devam et. duvara carpma!",
    emoji: "🐛",
  },
  {
    slug: "kuzu-freekick",
    title: "kuzu freekick",
    description: "3 asamali serbest vurus: nisan, guc, falso. duvardan ve kaleciden gec.",
    emoji: "🐑",
  },
  {
    slug: "kuzu-zipla",
    title: "kuzu zipla",
    description: "doodle jump. kuzu otomatik ziplar, yon tuslari. ne kadar yuksege?",
    emoji: "⬆️",
  },
  {
    slug: "tml-ruzgar-gulu",
    title: "tml ruzgar gulu",
    description: "ruzgar gulunu tut, cevir, birak. ne kadar hizli o kadar puan. combo var.",
    emoji: "💨",
  },
  {
    slug: "leninist-sapla",
    title: "leninist'e sapla",
    description: "donen tahtaya bicak firlat. hedef bolgelere isabet bonus, sapli bicaklara carpma.",
    emoji: "🔪",
  },
  {
    slug: "spot-gladyatoru",
    title: "spot gladyatörü",
    description: "karakterini yarat, arenada dövüş, altın topla, dükkandan eşya al, pvp yap. rpg + turn-based savaş.",
    emoji: "⚔️",
  },
];

export default function AtariSalonuPage() {
  return (
    <div className="w-full px-4 lg:px-8 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Gamepad2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold">atari salonu</h1>
          <p className="text-xs text-muted-foreground">
            mini oyunlar oyna, skor kas, yazarlar arasinda birinci ol.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {oyunlar.map((o) => (
          <Link
            key={o.slug}
            href={`/atari-salonu/${o.slug}`}
            className="group border border-border rounded-lg p-5 hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <div className="text-3xl mb-3">{o.emoji}</div>
            <h2 className="text-sm font-bold group-hover:text-primary transition-colors">
              {o.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">{o.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
