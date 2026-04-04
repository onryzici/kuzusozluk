import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Star } from "lucide-react";
import { formatTarih } from "@/lib/utils/format";

export const metadata = {
  title: "debe - kuzusozluk",
  description: "dünün en beğenilen entryleri",
};

export default async function DebePage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const entries = await prisma.entry.findMany({
    where: {
      createdAt: { gte: yesterdayStart, lt: todayStart },
      upvotes: { gte: 1 },
    },
    orderBy: { upvotes: "desc" },
    take: 10,
    include: {
      author: { select: { username: true } },
      topic: { select: { title: true, slug: true } },
    },
  });

  return (
    <div className="w-full px-4 lg:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Star className="h-4 w-4 text-yellow-500" />
        <h1 className="text-base font-medium text-foreground">
          dünün en beğenilen entryleri
        </h1>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        dün yazılan ve en çok beğenilen 10 entry
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          dünden beğenilen entry bulunamadı.
        </p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, index) => (
            <article key={entry.id} className="py-3 border-b border-border/40">
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
