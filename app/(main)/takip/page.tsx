import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EntryKart from "@/components/entry/EntryKart";
import Sayfalama from "@/components/shared/Sayfalama";

export const metadata = {
  title: "takip - kuzusozluk",
  description: "takip ettigin kullanici ve basliklardaki son entryler",
};

type Props = {
  searchParams: Promise<{ sayfa?: string }>;
};

export default async function TakipSayfa({ searchParams }: Props) {
  const { sayfa } = await searchParams;
  const page = Math.max(1, parseInt(sayfa || "1"));
  const pageSize = 10;

  const session = await auth();
  if (!session?.user) {
    redirect("/giris");
  }

  const currentUserId = (session.user as any).id;

  const followedUsers = await prisma.follow.findMany({
    where: { followerId: currentUserId },
    select: { followingId: true },
  });
  const followedUserIds = followedUsers.map((f) => f.followingId);

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

  const where = { authorId: { in: followedUserIds } };

  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
        topic: {
          select: { title: true, slug: true },
        },
        _count: { select: { comments: true } },
      },
    }),
    prisma.entry.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

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
                entryNumber={(page - 1) * pageSize + idx + 1}
                isCaylak={entry.author.role === "CAYLAK"}
                currentUserId={currentUserId}
                authorId={entry.author.id}
                commentCount={entry._count.comments}
              />
            </div>
          ))}
        </div>
      )}
      {totalPages > 1 && (
        <div className="mt-4">
          <Sayfalama
            currentPage={page}
            totalPages={totalPages}
            basePath="/takip"
          />
        </div>
      )}
    </div>
  );
}
