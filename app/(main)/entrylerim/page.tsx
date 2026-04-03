import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EntryKart from "@/components/entry/EntryKart";
import Link from "next/link";

export default async function EntrylerimSayfa() {
  const session = await auth();
  if (!session?.user) {
    redirect("/giris?callbackUrl=/entrylerim");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEntries = await prisma.entry.findMany({
    where: {
      authorId: session.user.id,
      createdAt: { gte: todayStart },
    },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      topic: { select: { title: true, slug: true } },
      _count: { select: { comments: true } },
    },
  });

  const hasToday = todayEntries.length > 0;

  const entries = hasToday
    ? todayEntries
    : await prisma.entry.findMany({
        where: { authorId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          topic: { select: { title: true, slug: true } },
          _count: { select: { comments: true } },
        },
      });

  return (
    <div className="px-4 py-6">
      <h1 className="text-base font-medium text-foreground mb-1">
        {hasToday ? "bugünkü entrylerim" : "entrylerim"}
      </h1>
      <p className="text-xs text-muted-foreground mb-4">
        {hasToday
          ? `bugün ${entries.length} entry yazdınız.`
          : "bugün entry yazmadınız, tüm entryleriniz gösteriliyor."}
      </p>

      {entries.length > 0 ? (
        <div className="divide-y divide-border/60">
          {entries.map((e, idx) => (
            <div key={e.id}>
              <Link
                href={`/baslik/${e.topic.slug}`}
                className="text-xs text-primary hover:underline font-medium inline-block pt-3"
              >
                {e.topic.title}
              </Link>
              <EntryKart
                id={e.id}
                content={e.content}
                upvotes={e.upvotes}
                downvotes={e.downvotes}
                authorUsername={e.author.username}
                authorAvatarUrl={e.author.avatarUrl}
                createdAt={e.createdAt.toISOString()}
                isEdited={e.isEdited}
                entryNumber={idx + 1}
                commentCount={(e as any)._count?.comments ?? 0}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-12 text-sm">
          henüz entry yazmadınız.
        </p>
      )}
    </div>
  );
}
