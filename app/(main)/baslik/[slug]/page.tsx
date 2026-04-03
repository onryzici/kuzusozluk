import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BaslikDetay from "@/components/baslik/BaslikDetay";
import BaslikTakipButon from "@/components/baslik/BaslikTakipButon";
import EntryKart from "@/components/entry/EntryKart";
import EntryForm from "@/components/entry/EntryForm";
import Sayfalama from "@/components/shared/Sayfalama";
import BaslikYokSayfa from "@/components/baslik/BaslikYokSayfa";
import SiralamaSekmeleri from "@/components/entry/SiralamaSekmeleri";
import AdminBaslikIslemleri from "@/components/baslik/AdminBaslikIslemleri";
import AnketGoster from "@/components/anket/AnketGoster";
import AnketButon from "@/components/anket/AnketButon";
import { auth } from "@/lib/auth";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sayfa?: string; q?: string; sira?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const topic = await prisma.topic.findUnique({
    where: { slug },
    select: { title: true, id: true },
  });

  if (!topic) {
    return { title: "baslik bulunamadi" };
  }

  const firstEntry = await prisma.entry.findFirst({
    where: { topicId: topic.id },
    orderBy: { createdAt: "asc" },
    select: { content: true },
  });

  const description = firstEntry
    ? firstEntry.content.slice(0, 160).replace(/\n/g, " ")
    : `${topic.title} hakkinda entryler`;

  return {
    title: `${topic.title} - kuzusozluk`,
    description,
    openGraph: {
      title: topic.title,
      description,
    },
  };
}

export default async function BaslikDetaySayfa({ params, searchParams }: Props) {
  const { slug } = await params;
  const { sayfa, q, sira } = await searchParams;

  const topic = await prisma.topic.findUnique({
    where: { slug },
  });

  // Başlık yoksa — Ekşi tarzı "bu başlık yok" sayfası
  if (!topic) {
    const session = await auth();

    // Benzer başlık önerileri
    const suggestions = await prisma.topic.findMany({
      where: { slug: { contains: slug.split("-")[0] } },
      take: 5,
      select: { title: true, slug: true, entryCount: true },
    });

    // Orijinal başlık metnini q parametresinden veya slug'dan türet
    const originalTitle = q || slug.replace(/-/g, " ");

    return (
      <BaslikYokSayfa
        title={originalTitle}
        slug={slug}
        suggestions={suggestions}
        isLoggedIn={!!session?.user}
      />
    );
  }

  const session = await auth();
  const page = Math.max(1, parseInt(sayfa || "1"));
  const pageSize = 10;
  const siralama = sira === "yeni" || sira === "populer" ? sira : "eski";

  // Sıralama ayarı
  const orderBy =
    siralama === "yeni"
      ? { createdAt: "desc" as const }
      : siralama === "populer"
        ? { upvotes: "desc" as const }
        : { createdAt: "asc" as const };

  // Check if current user follows this topic
  let isFollowingTopic = false;
  if (session?.user) {
    try {
      const topicFollow = await prisma.topicFollow.findUnique({
        where: {
          userId_topicId: {
            userId: (session.user as any).id,
            topicId: topic.id,
          },
        },
      });
      isFollowingTopic = !!topicFollow;
    } catch {
      // TopicFollow tablosu henüz yoksa sessizce devam et
    }
  }

  // çaylak entry'lerini sadece admin/mod görebilir
  const userRole = (session?.user as any)?.role;
  const canSeeCaylak = userRole === "ADMIN" || userRole === "MODERATOR";
  const entryWhere = canSeeCaylak
    ? { topicId: topic.id }
    : { topicId: topic.id, author: { role: { not: "CAYLAK" as const } } };

  const currentUserId = (session?.user as any)?.id || null;

  const [entries, total] = await Promise.all([
    prisma.entry.findMany({
      where: entryWhere,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true, role: true },
        },
        _count: { select: { comments: true } },
      },
    }),
    prisma.entry.count({ where: entryWhere }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/" className="lg:hidden flex items-center gap-1 text-xs text-muted-foreground mb-3 hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> başlıklar
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <BaslikDetay
          title={topic.title}
          entryCount={total}
          createdAt={topic.createdAt.toISOString()}
        />
        <div className="flex items-center gap-2 shrink-0">
          {session?.user && (
            <BaslikTakipButon
              topicSlug={slug}
              initialIsFollowing={isFollowingTopic}
            />
          )}
          {userRole === "ADMIN" && (
            <AdminBaslikIslemleri
              slug={slug}
              isLocked={topic.isLocked}
              isPinned={topic.isPinned}
            />
          )}
        </div>
      </div>
      <SiralamaSekmeleri slug={slug} current={siralama} />
      <AnketGoster topicSlug={slug} isLoggedIn={!!session?.user} />
      <div className="space-y-4">
        {entries.map((entry, idx) => (
          <EntryKart
            key={entry.id}
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
            currentUserRole={userRole}
            commentCount={entry._count.comments}
          />
        ))}
      </div>
      {entries.length === 0 && (
        <p className="text-muted-foreground text-center py-8">
          Henüz entry yazılmamış. İlk sen yaz!
        </p>
      )}
      {totalPages > 1 && (
        <Sayfalama
          currentPage={page}
          totalPages={totalPages}
          basePath={`/baslik/${slug}`}
        />
      )}
      {session?.user && !topic.isLocked && (
        <>
          <EntryForm topicSlug={slug} />
          <div className="mt-4 pt-4 border-t border-border/40">
            <AnketButon topicSlug={slug} />
          </div>
        </>
      )}
    </div>
  );
}
