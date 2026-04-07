import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EntryKart from "@/components/entry/EntryKart";
import { getCache, setCache } from "@/lib/redis";

export const metadata = {
  title: "takip - kuzusozluk",
  description: "takip ettigin kullanici ve basliklardaki son entryler",
};

export default async function TakipSayfa() {
  const session = await auth();
  if (!session?.user) {
    redirect("/giris");
  }

  const currentUserId = (session.user as any).id;

  // Takip edilen kullanıcıları cache'le (2 dk)
  const followCacheKey = `takip:${currentUserId}:follows`;
  let followedUserIds = await getCache<string[]>(followCacheKey);

  if (!followedUserIds) {
    const followedUsers = await prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });
    followedUserIds = followedUsers.map((f) => f.followingId);
    await setCache(followCacheKey, followedUserIds, 120);
  }

  if (followedUserIds.length === 0) {
    return (
      <div className="w-full px-4 lg:px-8 py-6">
        <h1 className="text-lg font-bold mb-4">takip</h1>
        <p className="text-sm text-muted-foreground text-center py-8">
          henuz kimseyi takip etmiyorsun.
        </p>
      </div>
    );
  }

  // Entryleri cache'le (30 sn)
  const entryCacheKey = `takip:${currentUserId}:entries`;
  let entries = await getCache<any[]>(entryCacheKey);

  if (!entries) {
    const dbEntries = await prisma.entry.findMany({
      where: {
        authorId: { in: followedUserIds },
      },
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

    await setCache(entryCacheKey, entries, 30);
  }

  return (
    <div className="w-full px-4 lg:px-8 py-6">
      <h1 className="text-lg font-bold mb-4">takip</h1>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          takip ettiklerinden henuz yeni entry yok.
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
