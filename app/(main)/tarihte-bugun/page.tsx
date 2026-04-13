import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { formatTarih } from "@/lib/utils/format";
import { auth } from "@/lib/auth";
import { caylakEntryWhere } from "@/lib/utils/caylakFilter";

export const metadata = {
  title: "tarihte bugün - kuzusozluk",
  description: "geçmiş yıllarda bugün yazılan entryler",
};

export default async function TarihteBugunPage() {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  const currentYear = now.getFullYear();

  // geçmiş yıllarda bugünün tarih aralıklarını oluştur
  const yearRanges: { start: Date; end: Date; year: number }[] = [];
  for (let year = currentYear - 1; year >= currentYear - 5; year--) {
    const start = new Date(year, month, day, 0, 0, 0);
    const end = new Date(year, month, day, 23, 59, 59, 999);
    yearRanges.push({ start, end, year });
  }

  const session = await auth();
  const viewer = { id: (session?.user as any)?.id, role: (session?.user as any)?.role };

  const entries = await prisma.entry.findMany({
    where: {
      AND: [
        {
          OR: yearRanges.map((r) => ({
            createdAt: { gte: r.start, lte: r.end },
          })),
        },
        caylakEntryWhere(viewer),
      ],
    },
    orderBy: { upvotes: "desc" },
    take: 20,
    include: {
      author: { select: { username: true } },
      topic: { select: { title: true, slug: true } },
    },
  });

  const monthNames = [
    "ocak", "şubat", "mart", "nisan", "mayıs", "haziran",
    "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık",
  ];

  return (
    <div className="w-full px-4 lg:px-8 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-primary" />
        <h1 className="text-base font-medium text-foreground">
          tarihte bugün — {day} {monthNames[month]}
        </h1>
      </div>

      <p className="text-xs text-muted-foreground mb-6">
        geçmiş yıllarda bugün yazılan en beğenilen entryler
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          geçmiş yıllarda bugüne ait entry bulunamadı.
        </p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <article key={entry.id} className="py-3 border-b border-border/40">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/baslik/${entry.topic.slug}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {entry.topic.title}
                  </Link>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {new Date(entry.createdAt).getFullYear()}
                  </span>
                </div>
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
                  {entry.upvotes > 0 && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      +{entry.upvotes}
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
