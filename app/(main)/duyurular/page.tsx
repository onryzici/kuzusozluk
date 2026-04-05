import { prisma } from "@/lib/prisma";
import { formatTarih } from "@/lib/utils/format";
import { Megaphone, Pin } from "lucide-react";
import Link from "next/link";

export default async function DuyurularPage() {
  const announcements = await prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: {
      author: { select: { username: true } },
    },
  });

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="h-4 w-4 text-primary" />
        <h1 className="text-base font-medium text-foreground">olan biten</h1>
      </div>

      {announcements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-16">
          henuz duyuru yok.
        </p>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <article
              key={a.id}
              className="border rounded-lg p-4 space-y-2"
            >
              <h2 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                {a.isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                {a.title}
              </h2>
              <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {a.content}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Link
                  href={`/kullanici/${a.author.username}`}
                  className="text-primary hover:underline"
                >
                  {a.author.username}
                </Link>
                <span>&middot;</span>
                <span>{formatTarih(a.createdAt.toISOString())}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
