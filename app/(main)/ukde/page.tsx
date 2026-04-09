import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import UkdeListesi from "@/components/ukde/UkdeListesi";
import Sayfalama from "@/components/shared/Sayfalama";

export const metadata = {
  title: "ukde - kuzusozluk",
  description: "açılmayı bekleyen başlıklar",
};

type Props = {
  searchParams: Promise<{ sayfa?: string }>;
};

export default async function UkdePage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.sayfa || "1", 10) || 1);
  const pageSize = 20;

  const session = await auth();

  const [ukdeler, total] = await Promise.all([
    prisma.ukde.findMany({
      where: { topicSlug: null },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: { select: { username: true } },
      },
    }),
    prisma.ukde.count({ where: { topicSlug: null } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  const data = ukdeler.map((u) => ({
    id: u.id,
    title: u.title,
    authorUsername: u.author.username,
    authorId: u.authorId,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="w-full px-4 lg:px-8 py-6">
      <UkdeListesi
        initialData={data}
        isLoggedIn={!!session?.user}
        currentUserId={(session?.user as any)?.id || null}
        currentUserRole={(session?.user as any)?.role || null}
      />
      {totalPages > 1 && (
        <div className="mt-4">
          <Sayfalama
            currentPage={page}
            totalPages={totalPages}
            basePath="/ukde"
          />
        </div>
      )}
    </div>
  );
}
