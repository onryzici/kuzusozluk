import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { formatTarih } from "@/lib/utils/format";

export default async function DunSayfa() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const topics = await prisma.topic.findMany({
    where: {
      createdAt: {
        gte: yesterdayStart,
        lt: todayStart,
      },
    },
    orderBy: { entryCount: "desc" },
    take: 50,
    include: {
      _count: { select: { entries: true } },
    },
  });

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="h-4 w-4 text-primary" />
        <h1 className="text-base font-medium text-foreground">dün</h1>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        dün açılan başlıklar
      </p>

      {topics.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-sm text-muted-foreground">
            dün açılan başlık yok.
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
          {topics.map((topic, index) => (
            <article
              key={topic.id}
              className="py-3 border-b border-border/40"
            >
              <div className="flex items-start gap-3">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0 pt-0.5">
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/baslik/${topic.slug}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {topic.title}
                  </Link>

                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-muted-foreground">
                      {formatTarih(topic.createdAt.toISOString())}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {topic._count.entries} entry
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
