import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Flame, TrendingUp } from "lucide-react";

export default async function GundemSayfa() {
  const topics = await prisma.topic.findMany({
    where: { dayCount: { gt: 0 } },
    orderBy: { dayCount: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      slug: true,
      entryCount: true,
      dayCount: true,
    },
  });

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-4 w-4 text-primary" />
        <h1 className="text-base font-medium text-foreground">gündem</h1>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        bugün en çok entry girilen başlıklar
      </p>

      {topics.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">
          bugün henüz gündemde başlık yok.
        </p>
      ) : (
        <div className="space-y-0.5">
          {topics.map((topic, index) => (
            <Link
              key={topic.id}
              href={`/baslik/${topic.slug}`}
              className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                  {index + 1}
                </span>
                <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {topic.title}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-xs text-muted-foreground">
                  {topic.entryCount} entry
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-primary">
                  <TrendingUp className="h-3 w-3" />
                  {topic.dayCount}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 border-t border-border/50 pt-4">
        <Link
          href="/bebe"
          className="text-xs text-primary hover:underline"
        >
          daha fazla &rarr; bugünün en beğenilen entryleri (bebe)
        </Link>
      </div>
    </div>
  );
}
