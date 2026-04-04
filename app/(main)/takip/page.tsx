import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EntryKart from "@/components/entry/EntryKart";

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

  // takip edilen kullanicilar
  const followedUsers = await prisma.follow.findMany({
    where: { followerId: currentUserId },
    select: { followingId: true },
  });
  const followedUserIds = followedUsers.map((f) => f.followingId);

  // hic takip yoksa bos sayfa
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

  // sadece takip edilen kullanicilarin entryleri
  const entries = await prisma.entry.findMany({
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

  return (
    <div className="w-full px-4 lg:px-8 py-6">
      <h1 className="text-lg font-bold mb-4">takip</h1>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          takip ettiklerinden henuz yeni entry yok.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
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
                createdAt={entry.createdAt.toISOString()}
                isEdited={entry.isEdited}
                entryNumber={idx + 1}
                isCaylak={entry.author.role === "CAYLAK"}
                currentUserId={currentUserId}
                authorId={entry.author.id}
                commentCount={entry._count.comments}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
