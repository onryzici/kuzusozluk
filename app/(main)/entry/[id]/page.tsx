import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EntryKart from "@/components/entry/EntryKart";
import Link from "next/link";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const entry = await prisma.entry.findUnique({
    where: { id },
    include: { topic: { select: { title: true } }, author: { select: { username: true } } },
  });
  if (!entry) return { title: "Entry bulunamadı" };
  return {
    title: `${entry.author.username} - ${entry.topic.title}`,
    description: entry.content.slice(0, 160),
  };
}

export default async function EntrySayfa({ params }: Props) {
  const { id } = await params;
  const entry = await prisma.entry.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true } },
      topic: { select: { id: true, title: true, slug: true } },
      _count: { select: { comments: true } },
    },
  });

  if (!entry) notFound();

  return (
    <div className="w-full px-4 lg:px-8 py-6">
      <Link href={`/baslik/${entry.topic.slug}`} className="text-xl font-bold text-primary hover:underline">
        {entry.topic.title}
      </Link>
      <div className="mt-4">
        <EntryKart
          id={entry.id}
          content={entry.content}
          upvotes={entry.upvotes}
          downvotes={entry.downvotes}
          authorUsername={entry.author.username}
          authorAvatarUrl={entry.author.avatarUrl}
          createdAt={entry.createdAt.toISOString()}
          isEdited={entry.isEdited}
          entryNumber={1}
          commentCount={entry._count.comments}
        />
      </div>
    </div>
  );
}
