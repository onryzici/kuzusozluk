import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { List } from "lucide-react";
import Sayfalama from "@/components/shared/Sayfalama";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function TumBasliklarSayfa({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.sayfa || "1"));

  const [topics, total] = await Promise.all([
    prisma.topic.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        entryCount: true,
        createdAt: true,
      },
    }),
    prisma.topic.count(),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <List className="h-4 w-4 text-primary" />
        <h1 className="text-base font-medium text-foreground">tüm başlıklar</h1>
        <span className="text-xs text-muted-foreground">({total})</span>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        bugüne kadar açılan tüm başlıklar, yeniden eskiye
      </p>

      {topics.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">
          henüz başlık yok.
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
                  {(page - 1) * PAGE_SIZE + index + 1}
                </span>
                <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {topic.title}
                </span>
              </div>

              <span className="text-xs text-muted-foreground shrink-0 ml-3">
                {topic.entryCount} entry
              </span>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Sayfalama
            currentPage={page}
            totalPages={totalPages}
            basePath="/gundem"
          />
        </div>
      )}
    </div>
  );
}
