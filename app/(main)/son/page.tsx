import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import EntryKart from "@/components/entry/EntryKart";
import { getCache, setCache } from "@/lib/redis";

export const metadata = {
  title: "son entryler - kuzusozluk",
  description: "en son yazilan entryler",
};

export default async function SonSayfa() {
  const session = await auth();
  const currentUserId = (session?.user as any)?.id || null;

  // 30 saniye cache
  const cacheKey = "son:entryler";
  let entries = await getCache<any[]>(cacheKey);

  if (!entries) {
    const dbEntries = await prisma.entry.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
        topic: {
          select: { title: true, slug: true },
        },
        _count: { select: { comments: true } },
      },
    });

    entries = dbEntries.map((e) => ({
      id: e.id,
      content: e.content,
      upvotes: e.upvotes,
      downvotes: e.downvotes,
      isEdited: e.isEdited,
      createdAt: e.createdAt.toISOString(),
      author: e.author,
      topic: e.topic,
      commentCount: e._count.comments,
    }));

    await setCache(cacheKey, entries, 30);
  }

  return (
    <div className="w-full px-4 lg:px-8 py-6">
      <h1 className="text-lg font-bold mb-4">son entryler</h1>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          henuz hicbir entry yazilmamis.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry: any, idx: number) => (
            <div key={entry.id}>
              <Link
                href={`/baslik/${entry.topic.slug}`}
                className="text-xs text-primary hover:underline font-medium"
              >
                {entry.topic.title}
              </Link>
              <EntryKart
                id={entry.id}
                content={entry.content}
                upvotes={entry.upvotes}
                downvotes={entry.downvotes}
                authorUsername={entry.author.username}
                authorAvatarUrl={entry.author.avatarUrl}
                createdAt={entry.createdAt}
                isEdited={entry.isEdited}
                entryNumber={idx + 1}
                isCaylak={entry.author.role === "CAYLAK"}
                currentUserId={currentUserId}
                authorId={entry.author.id}
                commentCount={entry.commentCount}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
