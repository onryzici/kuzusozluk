import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shuffle } from "lucide-react";
import { formatTarih } from "@/lib/utils/format";
import { auth } from "@/lib/auth";
import { caylakEntryWhere } from "@/lib/utils/caylakFilter";

export const dynamic = "force-dynamic";

export default async function RastgelePage() {
  const session = await auth();
  const viewer = { id: (session?.user as any)?.id, role: (session?.user as any)?.role };
  const where = caylakEntryWhere(viewer);
  const count = await prisma.entry.count({ where });

  if (count === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-sm text-muted-foreground py-16">
          henuz hic entry yazilmamis.
        </p>
      </div>
    );
  }

  const skip = Math.floor(Math.random() * count);
  const entries = await prisma.entry.findMany({
    where,
    skip,
    take: 1,
    include: {
      author: { select: { username: true } },
      topic: { select: { title: true, slug: true } },
    },
  });

  if (entries.length === 0) {
    redirect("/");
  }

  const entry = entries[0];

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Shuffle className="h-4 w-4 text-primary" />
        <h1 className="text-base font-medium text-foreground">rastgele entry</h1>
      </div>

      <article className="border rounded-lg p-4 space-y-3">
        <Link
          href={`/baslik/${entry.topic.slug}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          {entry.topic.title}
        </Link>

        <p className="text-[13px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
          {entry.content}
        </p>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <Link
            href={`/kullanici/${entry.author.username}`}
            className="text-primary hover:underline"
          >
            {entry.author.username}
          </Link>
          <span>{formatTarih(entry.createdAt.toISOString())}</span>
          <span className="text-green-600 dark:text-green-400">+{entry.upvotes}</span>
        </div>
      </article>

      <div className="mt-4">
        <Link
          href="/rastgele"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Shuffle className="h-3 w-3" />
          baska bir entry
        </Link>
      </div>
    </div>
  );
}
