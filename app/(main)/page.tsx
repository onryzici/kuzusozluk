import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DesktopRedirect from "@/components/shared/DesktopRedirect";

export const dynamic = "force-dynamic";

export default async function AnaSayfa() {
  const topics = await prisma.topic.findMany({
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      slug: true,
      isPinned: true,
      _count: { select: { entries: true } },
    },
  });

  const sorted = [...topics].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  const firstSlug = sorted[0]?.slug;

  return (
    <>
      {/* masaüstünde ilk başlığa redirect */}
      {firstSlug && <DesktopRedirect slug={firstSlug} />}

      {/* mobilde başlık listesi */}
      <div className="px-3 py-3 lg:hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">bugün</span>
        </div>
        <div className="space-y-px">
          {sorted.map((t) => (
            <Link
              key={t.id}
              href={`/baslik/${t.slug}`}
              className="flex items-center justify-between py-2.5 px-2 rounded hover:bg-accent/60 transition-colors"
            >
              <span className={`text-sm text-foreground/85 ${t.isPinned ? "font-bold" : ""}`}>
                {t.isPinned && <span className="text-primary mr-1">&bull;</span>}
                {t.title}
              </span>
              {t._count.entries > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">
                  {t._count.entries}
                </span>
              )}
            </Link>
          ))}
        </div>
        {topics.length === 0 && (
          <p className="text-muted-foreground text-center py-16 text-sm">henüz içerik yok.</p>
        )}
      </div>

      {/* masaüstünde boş — redirect çalışacak */}
      <div className="hidden lg:block px-4 py-16 text-center">
        <p className="text-muted-foreground text-sm">yükleniyor...</p>
      </div>
    </>
  );
}
