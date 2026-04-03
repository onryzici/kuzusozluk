import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { formatTarih } from "@/lib/utils/format";

export default async function DebeSayfa() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Try today first
  let entries = await prisma.entry.findMany({
    where: {
      createdAt: { gte: todayStart },
    },
    orderBy: { upvotes: "desc" },
    take: 10,
    include: {
      author: { select: { username: true } },
      topic: { select: { title: true, slug: true } },
    },
  });

  let period = "bugün";

  // If no entries today, try last 7 days
  if (entries.length === 0) {
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);

    entries = await prisma.entry.findMany({
      where: {
        createdAt: { gte: weekAgo },
      },
      orderBy: { upvotes: "desc" },
      take: 10,
      include: {
        author: { select: { username: true } },
        topic: { select: { title: true, slug: true } },
      },
    });

    period = "son 7 gün";
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <h1 className="text-base font-medium text-foreground">
          {period === "bugün" ? "bugünün en beğenilen entryleri" : "son 7 günün en beğenilen entryleri"}
        </h1>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        {period === "bugün" ? "bugün" : "son 7 günde"} en çok beğenilen entryler
      </p>

      {entries.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-sm text-muted-foreground">
            henüz beğenilen entry yok.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/" className="text-xs text-primary hover:underline">
              gündem
            </Link>
            <Link href="/baslik/yeni" className="text-xs text-primary hover:underline">
              başlık aç
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, index) => (
            <article
              key={entry.id}
              className="py-3 border-b border-border/40"
            >
              <div className="flex items-start gap-3">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0 pt-0.5">
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/baslik/${entry.topic.slug}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {entry.topic.title}
                  </Link>

                  <p className="text-[13px] text-foreground/80 mt-1 line-clamp-3 leading-relaxed">
                    {entry.content}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <Link
                      href={`/kullanici/${entry.author.username}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {entry.author.username}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">
                      {formatTarih(entry.createdAt.toISOString())}
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      +{entry.upvotes}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
