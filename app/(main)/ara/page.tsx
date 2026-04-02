import { prisma } from "@/lib/prisma";
import BaslikKart from "@/components/baslik/BaslikKart";
import Link from "next/link";

type Props = {
  searchParams: Promise<{ q?: string; tip?: string }>;
};

export default async function AramaSayfa({ searchParams }: Props) {
  const { q, tip = "baslik" } = await searchParams;

  if (!q || q.trim().length < 2) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-4">Arama</h1>
        <p className="text-muted-foreground">En az 2 karakter girin.</p>
      </div>
    );
  }

  let results: React.ReactNode = null;

  if (tip === "baslik") {
    const topics = await prisma.topic.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 50,
      select: { id: true, title: true, slug: true, entryCount: true, dayCount: true },
    });
    results = topics.length > 0 ? (
      <div className="space-y-0.5">
        {topics.map((t) => (
          <BaslikKart key={t.id} title={t.title} slug={t.slug} entryCount={t.entryCount} dayCount={t.dayCount} />
        ))}
      </div>
    ) : (
      <p className="text-muted-foreground">Sonuç bulunamadı.</p>
    );
  } else if (tip === "entry") {
    const entries = await prisma.entry.findMany({
      where: { content: { contains: q, mode: "insensitive" } },
      take: 50,
      include: {
        author: { select: { username: true } },
        topic: { select: { title: true, slug: true } },
      },
    });
    results = entries.length > 0 ? (
      <div className="space-y-3">
        {entries.map((e) => (
          <div key={e.id} className="border-b pb-3">
            <Link href={`/baslik/${e.topic.slug}`} className="text-sm font-medium text-primary hover:underline">
              {e.topic.title}
            </Link>
            <p className="text-sm mt-1">{e.content.slice(0, 200)}{e.content.length > 200 ? "..." : ""}</p>
            <p className="text-xs text-muted-foreground mt-1">— {e.author.username}</p>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-muted-foreground">Sonuç bulunamadı.</p>
    );
  } else if (tip === "kullanici") {
    const users = await prisma.user.findMany({
      where: { username: { contains: q, mode: "insensitive" } },
      take: 50,
      select: { id: true, username: true, displayName: true, entryCount: true },
    });
    results = users.length > 0 ? (
      <div className="space-y-2">
        {users.map((u) => (
          <Link key={u.id} href={`/kullanici/${u.username}`} className="flex items-center justify-between py-2 px-3 hover:bg-accent rounded">
            <span className="text-sm font-medium">{u.username}</span>
            <span className="text-xs text-muted-foreground">{u.entryCount} entry</span>
          </Link>
        ))}
      </div>
    ) : (
      <p className="text-muted-foreground">Sonuç bulunamadı.</p>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-2">&ldquo;{q}&rdquo; arama sonuçları</h1>
      <div className="flex gap-4 mb-4 text-sm">
        <Link href={`/ara?q=${q}&tip=baslik`} className={tip === "baslik" ? "font-bold text-primary" : "text-muted-foreground hover:text-foreground"}>
          başlıklar
        </Link>
        <Link href={`/ara?q=${q}&tip=entry`} className={tip === "entry" ? "font-bold text-primary" : "text-muted-foreground hover:text-foreground"}>
          entryler
        </Link>
        <Link href={`/ara?q=${q}&tip=kullanici`} className={tip === "kullanici" ? "font-bold text-primary" : "text-muted-foreground hover:text-foreground"}>
          kullanıcılar
        </Link>
      </div>
      {results}
    </div>
  );
}
