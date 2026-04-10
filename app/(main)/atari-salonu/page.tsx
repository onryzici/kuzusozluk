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
    slug: "reflex",
    title: "reflex testi",
    description: "5 turluk reaksiyon olcumu. ne kadar hizliysan o kadar puan.",
    emoji: "⚡",
  },
  {
    slug: "hatirla",
    title: "hatirla",
    description: "beliren kareleri ezberle, kaybolduginda ayni yere tikla. memory matrix.",
    emoji: "🧠",
  },
  {
    slug: "nisanci",
    title: "kuzu nisanci",
    description: "60 saniye kuzulara tikla, bombalardan kac. hedefler kuculur ve hareket eder.",
    emoji: "🎯",
  },
  {
    slug: "kule",
    title: "kule ustasi",
    description: "blok yigma. tam hizada bindirirsen perfect chain. dusarda kalan kesilir.",
    emoji: "🧱",
  },
  {
    slug: "kelimelik",
    title: "kelimelik",
    description: "5 harfli turkce kelimeyi 6 denemede bul. wordle turkce.",
    emoji: "🔤",
  },
  {
    slug: "plinko",
    title: "plinko",
    description: "10 top, civili tahta. uctaki slotlar x100 carpan. nereye dusecek?",
    emoji: "⚪",
  },
  {
    slug: "kuzu-zipla",
    title: "kuzu zipla",
    description: "doodle jump. kuzu otomatik ziplar, yon tuslari. ne kadar yuksege?",
    emoji: "⬆️",
  },
  {
    slug: "helix",
    title: "helix jump",
    description: "donen kuleden top dusur. kirmizidan kac, mavi halkalari geç.",
    emoji: "🌀",
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
