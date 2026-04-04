import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import UkdeListesi from "@/components/ukde/UkdeListesi";

export const metadata = {
  title: "ukde - kuzusozluk",
  description: "açılmayı bekleyen başlıklar",
};

export default async function UkdePage() {
  const session = await auth();

  const ukdeler = await prisma.ukde.findMany({
    where: { topicSlug: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { username: true } },
    },
  });

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
    </div>
  );
}
