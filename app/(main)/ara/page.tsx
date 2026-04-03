import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AramaSayfaInput from "@/components/shared/AramaSayfaInput";
import { toSlug } from "@/lib/utils/slug";

type Props = {
  searchParams: Promise<{ q?: string; tip?: string }>;
};

export default async function AramaSayfa({ searchParams }: Props) {
  const { q, tip = "baslik" } = await searchParams;

  if (!q || q.trim().length < 2) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <AramaSayfaInput initialQuery="" />
        <p className="text-muted-foreground text-sm text-center py-8">başlık, entry veya kullanıcı ara.</p>
      </div>
    );
  }

  let results: React.ReactNode = null;

  if (tip === "baslik") {
    const topics = await prisma.topic.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 50,
      select: { id: true, title: true, slug: true, _count: { select: { entries: true } } },
    });
    const slug = toSlug(q);
    const baslikAcLink = (
      <Link
        href={`/baslik/${slug}?q=${encodeURIComponent(q)}`}
        className="flex items-center justify-center py-3 text-sm text-primary hover:underline font-medium border-t border-border/30 mt-2"
      >
        &ldquo;{q}&rdquo; başlığını aç
      </Link>
    );

    results = (
      <>
        {topics.length > 0 ? (
          <div className="divide-y divide-border/30">
            {topics.map((t) => (
              <Link key={t.id} href={`/baslik/${t.slug}`} className="flex items-center justify-between py-2.5 px-2 hover:bg-accent/60 transition-colors">
                <span className="text-sm">{t.title}</span>
                <span className="text-xs text-muted-foreground ml-2">{t._count.entries}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-4">sonuç bulunamadı.</p>
        )}
        {baslikAcLink}
      </>
    );
  } else if (tip === "entry") {
    const entries = await prisma.entry.findMany({
      where: { content: { contains: q, mode: "insensitive" } },
      take: 50,
      include: { author: { select: { username: true } }, topic: { select: { title: true, slug: true } } },
    });
    results = entries.length > 0 ? (
      <div className="space-y-3">
        {entries.map((e) => (
          <div key={e.id} className="border-b border-border/30 pb-3">
            <Link href={`/baslik/${e.topic.slug}`} className="text-xs text-primary hover:underline font-medium">{e.topic.title}</Link>
            <p className="text-sm mt-1">{e.content.slice(0, 200)}{e.content.length > 200 ? "..." : ""}</p>
            <p className="text-xs text-muted-foreground mt-1">— {e.author.username}</p>
          </div>
        ))}
      </div>
    ) : <p className="text-muted-foreground text-sm text-center py-8">sonuç bulunamadı.</p>;
  } else if (tip === "kullanici") {
    const users = await prisma.user.findMany({
      where: { username: { contains: q, mode: "insensitive" } },
      take: 50,
      select: { id: true, username: true, entryCount: true },
    });
    results = users.length > 0 ? (
      <div className="divide-y divide-border/30">
        {users.map((u) => (
          <Link key={u.id} href={`/kullanici/${u.username}`} className="flex items-center justify-between py-2.5 px-2 hover:bg-accent/60 transition-colors">
            <span className="text-sm font-medium">{u.username}</span>
            <span className="text-xs text-muted-foreground">{u.entryCount} entry</span>
          </Link>
        ))}
      </div>
    ) : <p className="text-muted-foreground text-sm text-center py-8">sonuç bulunamadı.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <AramaSayfaInput initialQuery={q} />
      <div className="flex gap-4 mb-4 text-sm">
        {[
          { key: "baslik", label: "başlıklar" },
          { key: "entry", label: "entryler" },
          { key: "kullanici", label: "kullanıcılar" },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/ara?q=${q}&tip=${t.key}`}
            className={tip === t.key ? "font-bold text-primary text-xs" : "text-muted-foreground hover:text-foreground text-xs"}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {results}
    </div>
  );
}
