import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import EntryKart from "@/components/entry/EntryKart";

export const metadata = {
  title: "son entryler - kuzusozluk",
  description: "en son yazilan entryler",
};

export default async function SonSayfa() {
  const session = await auth();
  const currentUserId = (session?.user as any)?.id || null;

  const entries = await prisma.entry.findMany({
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
      <h1 className="text-lg font-bold mb-4">son entryler</h1>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          henuz hicbir entry yazilmamis.
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
